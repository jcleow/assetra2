"use client";

import type { FinancialPlanPayload } from "@/app/api/financial-plan/route";
import { toast } from "@/components/toast";
import { useFinancialPlanningStore } from "@/features/financial-planning/store";
import {
  computeMonthlyCashFlow,
  type Frequency,
  financialClient,
} from "@/lib/financial";
import type { IntentAction } from "@/lib/intent/parser";
import { generateUUID } from "@/lib/utils";

const CHAT_CREATED_NOTE = "Added via chat intent";
const DEFAULT_ASSET_GROWTH_RATE = 0.05;
const DEFAULT_LIABILITY_INTEREST_RATE = 0.05;
const DEFAULT_LIABILITY_MIN_PAYMENT_FACTOR = 0.02;
const DEFAULT_CASHFLOW_FREQUENCY: Frequency = "monthly";

export class IntentDispatchError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "IntentDispatchError";
  }
}

type DispatchParams = {
  intentId: string;
  chatId?: string;
  actions: IntentAction[];
};

export async function dispatchIntentActions({
  intentId,
  chatId,
  actions,
}: DispatchParams) {
  if (actions.length === 0) {
    return;
  }

  const state = useFinancialPlanningStore.getState();
  if (!state.financialPlan) {
    throw new IntentDispatchError(
      "No financial plan loaded. Try refreshing the dashboard."
    );
  }

  const plan = structuredClone(state.financialPlan) as FinancialPlanPayload;
  plan.assets ??= [];
  plan.liabilities ??= [];
  plan.incomes ??= [];
  plan.expenses ??= [];
  plan.cashflow ??= {
    summary: {
      monthlyIncome: plan.summary.monthlyIncome,
      monthlyExpenses: plan.summary.monthlyExpenses,
      netMonthly: plan.summary.monthlySavings,
    },
    breakdown: plan.cashflow?.breakdown ?? {},
  };

  for (const action of actions) {
    logIntentAction(intentId, chatId, action);
    await persistAction(state.financialPlan, action);
    applyAction(plan, action);
  }

  recalcSummary(plan);
  plan.lastUpdated = new Date().toISOString();

  state.setFinancialPlan(plan);
  await state.runProjection();

  await Promise.all(
    actions.map((action, index) =>
      emitAuditEvent(`${intentId}:${index}`, chatId, action)
    )
  );

  try {
    await state.refreshData();
  } catch (error) {
    console.warn("Failed to refresh financial data", error);
  }
}

function applyAction(plan: FinancialPlanPayload, action: IntentAction) {
  switch (action.entity) {
    case "asset":
      adjustAsset(plan, action);
      break;
    case "liability":
      console.log("adjusting liability...\n");
      adjustLiability(plan, action);
      break;
    case "income":
      adjustIncome(plan, action);
      break;
    case "expense":
      adjustExpense(plan, action);
      break;
    default:
      throw new IntentDispatchError(
        `Unsupported entity "${action.entity}" in "${action.raw ?? ""}".`
      );
  }
}

function ensureAmount(action: IntentAction): number {
  if (typeof action.amount !== "number") {
    throw new IntentDispatchError(
      `No amount detected for "${action.raw ?? action.verb}".`
    );
  }
  return action.amount;
}

function adjustAsset(plan: FinancialPlanPayload, action: IntentAction) {
  const target = matchEntity(plan.assets ?? [], action.target);
  if (!target) {
    if (canCreateFromAction(action)) {
      const created = createAssetFromIntent(action);
      plan.assets!.push(created);
      return;
    }
    throw new IntentDispatchError(
      `Could not find an asset matching "${action.target ?? ""}".`
    );
  }

  if (action.verb === "remove-item") {
    plan.assets = plan.assets?.filter((asset) => asset.id !== target.id) ?? [];
    return;
  }

  if (action.verb === "update") {
    const amount = ensureAmount(action);
    target.currentValue = Math.max(0, amount);
    target.updatedAt = new Date().toISOString();
  }
}

function adjustLiability(plan: FinancialPlanPayload, action: IntentAction) {
  const target = matchEntity(plan.liabilities ?? [], action.target);
  if (!target) {
    if (canCreateFromAction(action)) {
      const created = createLiabilityFromIntent(action);
      plan.liabilities!.push(created);
      return;
    }
    throw new IntentDispatchError(
      `Could not find a liability matching "${action.target ?? ""}".`
    );
  }

  if (action.verb === "remove-item") {
    plan.liabilities =
      plan.liabilities?.filter((liability) => liability.id !== target.id) ?? [];
    return;
  }

  if (action.verb === "update") {
    const amount = ensureAmount(action);
    target.currentBalance = Math.max(0, amount);
    target.updatedAt = new Date().toISOString();
  }
}

function adjustIncome(plan: FinancialPlanPayload, action: IntentAction) {
  plan.incomes ??= [];
  const target = matchIncome(plan.incomes, action.target);

  if (!target) {
    if (!canCreateFromAction(action)) {
      throw new IntentDispatchError(
        `Could not find an income matching "${action.target ?? ""}".`
      );
    }
    const created = createIncomeFromIntent(action);
    plan.incomes.push(created);
    syncCashflowSummary(plan);
    return;
  }

  if (action.verb === "remove-item") {
    plan.incomes = plan.incomes.filter((income) => income.id !== target.id);
    syncCashflowSummary(plan);
    return;
  }

  if (action.verb === "update") {
    const amount = ensureAmount(action);
    target.amount = Math.max(0, amount);
    target.updatedAt = new Date().toISOString();
    syncCashflowSummary(plan);
  }
}

function adjustExpense(plan: FinancialPlanPayload, action: IntentAction) {
  plan.expenses ??= [];
  const target = matchExpense(plan.expenses, action.target);

  if (!target) {
    if (!canCreateFromAction(action)) {
      throw new IntentDispatchError(
        `Could not find an expense matching "${action.target ?? ""}".`
      );
    }
    const created = createExpenseFromIntent(action);
    plan.expenses.push(created);
    syncCashflowSummary(plan);
    return;
  }

  if (action.verb === "remove-item") {
    plan.expenses = plan.expenses.filter((expense) => expense.id !== target.id);
    syncCashflowSummary(plan);
    return;
  }

  if (action.verb === "update") {
    const amount = ensureAmount(action);
    target.amount = Math.max(0, amount);
    target.updatedAt = new Date().toISOString();
    syncCashflowSummary(plan);
  }
}

function mutateValue(
  current: number,
  delta: number,
  verb: IntentAction["verb"],
  options?: { removeZero?: boolean }
) {
  switch (verb) {
    case "add-item":
      return current + delta;
    case "update":
      return delta; // For update, delta is the final value
    case "remove-item":
      return options?.removeZero ? 0 : current - delta;
    default:
      return current;
  }
}

function recalcSummary(plan: FinancialPlanPayload) {
  const totalAssets = (plan.assets ?? []).reduce(
    (sum, asset) => sum + asset.currentValue,
    0
  );
  const totalLiabilities = (plan.liabilities ?? []).reduce(
    (sum, liability) => sum + liability.currentBalance,
    0
  );
  const monthlyIncome = plan.summary.monthlyIncome;
  const monthlyExpenses = plan.summary.monthlyExpenses;

  plan.summary.totalAssets = totalAssets;
  plan.summary.totalLiabilities = totalLiabilities;
  plan.summary.netWorth = totalAssets - totalLiabilities;
  plan.summary.monthlySavings = monthlyIncome - monthlyExpenses;
  plan.summary.savingsRate =
    monthlyIncome > 0 ? plan.summary.monthlySavings / monthlyIncome : 0;
  if (plan.cashflow) {
    plan.cashflow.summary.monthlyIncome = plan.summary.monthlyIncome;
    plan.cashflow.summary.monthlyExpenses = plan.summary.monthlyExpenses;
    plan.cashflow.summary.netMonthly = plan.summary.monthlySavings;
  }
}

async function persistAction(
  plan: FinancialPlanPayload | null,
  action: IntentAction
) {
  if (!plan) return;

  switch (action.entity) {
    case "asset":
      await persistAsset(plan, action);
      break;
    case "liability":
      await persistLiability(plan, action);
      break;
    case "income":
      await persistIncome(plan, action);
      break;
    case "expense":
      await persistExpense(plan, action);
      break;
    default:
      break;
  }
}

function normalizeTarget(target?: string | null) {
  return target?.trim().toLowerCase() ?? "";
}

function matchEntity<T extends { name: string }>(
  list: T[],
  target?: string | null
) {
  if (!target) return null;
  const normalized = normalizeTarget(target);
  return (
    list.find((item) => normalizeTarget(item.name) === normalized) ??
    list.find((item) => normalizeTarget(item.name).includes(normalized))
  );
}

function canCreateFromAction(action: IntentAction) {
  return (
    action.verb === "add-item" &&
    typeof action.amount === "number"
  );
}

function deriveEntityName(target: string | null | undefined, fallback: string) {
  if (!target) {
    return fallback;
  }
  let name = target.trim();
  const calledMatch = name.match(/(?:called|named)\s+(.+)/i);
  if (calledMatch) {
    name = calledMatch[1];
  }
  name = name.replace(/^(a|an)\s+new\s+/i, "");
  name = name.replace(/\b(asset|liability|income|expense)\b/gi, "").trim();
  return name.length > 0 ? name : fallback;
}

function createAssetFromIntent(action: IntentAction) {
  const amount = ensureAmount(action);
  const now = new Date().toISOString();
  return {
    id: generateUUID(),
    name: deriveEntityName(action.target, "New Asset"),
    category: "chat",
    currentValue: Math.max(0, amount),
    annualGrowthRate: DEFAULT_ASSET_GROWTH_RATE,
    notes: CHAT_CREATED_NOTE,
    updatedAt: now,
  } satisfies FinancialPlanPayload["assets"][number];
}

function createLiabilityFromIntent(action: IntentAction) {
  const amount = ensureAmount(action);
  const now = new Date().toISOString();
  const balance = Math.max(0, amount);
  const minimumPayment = Math.max(
    0,
    Math.round(balance * DEFAULT_LIABILITY_MIN_PAYMENT_FACTOR * 100) / 100
  );
  return {
    id: generateUUID(),
    name: deriveEntityName(action.target, "New Liability"),
    category: "chat",
    currentBalance: balance,
    interestRateApr: DEFAULT_LIABILITY_INTEREST_RATE,
    minimumPayment,
    notes: CHAT_CREATED_NOTE,
    updatedAt: now,
  } satisfies FinancialPlanPayload["liabilities"][number];
}

async function emitAuditEvent(
  intentId: string,
  chatId: string | undefined,
  action: IntentAction
) {
  try {
    await fetch("/api/actions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        intentId,
        chatId,
        action,
      }),
    });
  } catch (error) {
    console.warn("Failed to emit audit event", error);
    toast({
      type: "error",
      description: "Unable to record action audit trail.",
    });
  }
}

async function persistAsset(plan: FinancialPlanPayload, action: IntentAction) {
  const target = matchEntity(plan.assets ?? [], action.target);

  if (!target) {
    if (!canCreateFromAction(action)) {
      throw new IntentDispatchError(
        `Could not find an asset matching "${action.target ?? ""}".`
      );
    }
    const amount = ensureAmount(action);
    await financialClient.assets.create({
      name: deriveEntityName(action.target, "New Asset"),
      category: "chat",
      currentValue: Math.max(0, amount),
      annualGrowthRate: DEFAULT_ASSET_GROWTH_RATE,
      notes: CHAT_CREATED_NOTE,
    });
    return;
  }

  if (action.verb === "remove-item") {
    await financialClient.assets.delete(target.id);
    return;
  }

  const delta = ensureAmount(action);
  const nextValue = Math.max(
    0,
    mutateValue(target.currentValue, delta, action.verb)
  );

  await financialClient.assets.update({
    id: target.id,
    name: target.name,
    category: target.category,
    currentValue: nextValue,
    annualGrowthRate: target.annualGrowthRate,
    notes: target.notes ?? undefined,
  });
}

async function persistLiability(
  plan: FinancialPlanPayload,
  action: IntentAction
) {
  const target = matchEntity(plan.liabilities ?? [], action.target);
  if (!target) {
    if (!canCreateFromAction(action)) {
      throw new IntentDispatchError(
        `Could not find a liability matching "${action.target ?? ""}".`
      );
    }
    const amount = ensureAmount(action);
    const balance = Math.max(0, amount);
    const minimumPayment = Math.max(
      0,
      Math.round(balance * DEFAULT_LIABILITY_MIN_PAYMENT_FACTOR * 100) / 100
    );
    await financialClient.liabilities.create({
      name: deriveEntityName(action.target, "New Liability"),
      category: "chat",
      currentBalance: balance,
      interestRateApr: DEFAULT_LIABILITY_INTEREST_RATE,
      minimumPayment,
      notes: CHAT_CREATED_NOTE,
    });
    return;
  }

  if (action.verb === "remove-item") {
    await financialClient.liabilities.delete(target.id);
    return;
  }

  const delta = ensureAmount(action);
  const nextBalance = Math.max(
    0,
    mutateValue(target.currentBalance, delta, action.verb)
  );

  await financialClient.liabilities.update({
    id: target.id,
    name: target.name,
    category: target.category,
    currentBalance: nextBalance,
    interestRateApr: target.interestRateApr,
    minimumPayment: target.minimumPayment,
    notes: target.notes ?? undefined,
  });
}

function matchIncome(
  incomes: NonNullable<FinancialPlanPayload["incomes"]>,
  target?: string | null
) {
  if (!target) return null;
  const normalized = normalizeTarget(target);
  return (
    incomes.find((income) => normalizeTarget(income.source) === normalized) ??
    incomes.find((income) =>
      normalizeTarget(income.source).includes(normalized)
    ) ??
    null
  );
}

function matchExpense(
  expenses: NonNullable<FinancialPlanPayload["expenses"]>,
  target?: string | null
) {
  if (!target) return null;
  const normalized = normalizeTarget(target);
  return (
    expenses.find((expense) => normalizeTarget(expense.payee) === normalized) ??
    expenses.find((expense) =>
      normalizeTarget(expense.payee).includes(normalized)
    ) ??
    null
  );
}

function createIncomeFromIntent(action: IntentAction) {
  const amount = ensureAmount(action);
  const now = new Date().toISOString();
  return {
    id: generateUUID(),
    source: deriveEntityName(action.target, "New Income"),
    category: "chat",
    amount: Math.max(0, amount),
    frequency: DEFAULT_CASHFLOW_FREQUENCY,
    startDate: now,
    notes: CHAT_CREATED_NOTE,
    updatedAt: now,
  } satisfies FinancialPlanPayload["incomes"][number];
}

function createExpenseFromIntent(action: IntentAction) {
  const amount = ensureAmount(action);
  const now = new Date().toISOString();
  return {
    id: generateUUID(),
    payee: deriveEntityName(action.target, "New Expense"),
    category: "chat",
    amount: Math.max(0, amount),
    frequency: DEFAULT_CASHFLOW_FREQUENCY,
    notes: CHAT_CREATED_NOTE,
    updatedAt: now,
  } satisfies FinancialPlanPayload["expenses"][number];
}

function syncCashflowSummary(plan: FinancialPlanPayload) {
  const summary = computeMonthlyCashFlow(
    plan.incomes ?? [],
    plan.expenses ?? []
  );
  plan.cashflow ??= {
    summary: {
      monthlyIncome: summary.monthlyIncome,
      monthlyExpenses: summary.monthlyExpenses,
      netMonthly: summary.netMonthly,
    },
    breakdown: plan.cashflow?.breakdown ?? {},
  };
  plan.cashflow.summary = {
    ...plan.cashflow.summary,
    monthlyIncome: summary.monthlyIncome,
    monthlyExpenses: summary.monthlyExpenses,
    netMonthly: summary.netMonthly,
  };
  plan.summary.monthlyIncome = summary.monthlyIncome;
  plan.summary.monthlyExpenses = summary.monthlyExpenses;
  plan.summary.monthlySavings = summary.netMonthly;
  plan.summary.savingsRate =
    summary.monthlyIncome > 0 ? summary.netMonthly / summary.monthlyIncome : 0;
}

async function persistIncome(plan: FinancialPlanPayload, action: IntentAction) {
  const target = matchIncome(plan.incomes ?? [], action.target);

  if (!target) {
    if (!canCreateFromAction(action)) {
      throw new IntentDispatchError(
        `Could not find an income matching "${action.target ?? ""}".`
      );
    }
    const amount = ensureAmount(action);
    await financialClient.incomes.create({
      source: deriveEntityName(action.target, "New Income"),
      category: "chat",
      amount: Math.max(0, amount),
      frequency: DEFAULT_CASHFLOW_FREQUENCY,
      startDate: new Date().toISOString(),
      notes: CHAT_CREATED_NOTE,
    });
    return;
  }

  if (action.verb === "remove-item") {
    await financialClient.incomes.delete(target.id);
    return;
  }

  const delta = ensureAmount(action);
  const nextAmount = Math.max(
    0,
    mutateValue(target.amount, delta, action.verb)
  );

  await financialClient.incomes.update({
    id: target.id,
    source: target.source,
    category: target.category,
    amount: nextAmount,
    frequency: target.frequency,
    startDate: target.startDate,
    notes: target.notes ?? undefined,
  });
}

async function persistExpense(
  plan: FinancialPlanPayload,
  action: IntentAction
) {
  const target = matchExpense(plan.expenses ?? [], action.target);

  if (!target) {
    if (!canCreateFromAction(action)) {
      throw new IntentDispatchError(
        `Could not find an expense matching "${action.target ?? ""}".`
      );
    }
    const amount = ensureAmount(action);
    await financialClient.expenses.create({
      payee: deriveEntityName(action.target, "New Expense"),
      category: "chat",
      amount: Math.max(0, amount),
      frequency: DEFAULT_CASHFLOW_FREQUENCY,
      notes: CHAT_CREATED_NOTE,
    });
    return;
  }

  if (action.verb === "remove-item") {
    await financialClient.expenses.delete(target.id);
    return;
  }

  const delta = ensureAmount(action);
  const nextAmount = Math.max(
    0,
    mutateValue(target.amount, delta, action.verb)
  );

  await financialClient.expenses.update({
    id: target.id,
    payee: target.payee,
    category: target.category,
    amount: nextAmount,
    frequency: target.frequency,
    notes: target.notes ?? undefined,
  });
}

function logIntentAction(
  intentId: string,
  chatId: string | undefined,
  action: IntentAction
) {
  try {
    console.info("[intent:action]", {
      intentId,
      chatId,
      action,
    });
  } catch {
    // ignore logging failures
  }
}
