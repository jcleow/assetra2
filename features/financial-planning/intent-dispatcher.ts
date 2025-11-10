"use client";

import type { FinancialPlanPayload } from "@/app/api/financial-plan/route";
import { toast } from "@/components/toast";
import { useFinancialPlanningStore } from "@/features/financial-planning/store";
import type { IntentAction } from "@/lib/intent/parser";
import { generateUUID } from "@/lib/utils";

const CHAT_CREATED_NOTE = "Added via chat intent";
const DEFAULT_ASSET_GROWTH_RATE = 0.05;
const DEFAULT_LIABILITY_INTEREST_RATE = 0.05;
const DEFAULT_LIABILITY_MIN_PAYMENT_FACTOR = 0.02;

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
}

function applyAction(plan: FinancialPlanPayload, action: IntentAction) {
  switch (action.entity) {
    case "asset":
      adjustAsset(plan, action);
      break;
    case "liability":
      adjustLiability(plan, action);
      break;
    case "income":
      adjustCashflow(plan, action, "monthlyIncome");
      break;
    case "expense":
      adjustCashflow(plan, action, "monthlyExpenses");
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
  let target = matchEntity(plan.assets ?? [], action.target);
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

  if (action.verb === "remove" && action.amount == null) {
    plan.assets = plan.assets?.filter((asset) => asset.id !== target.id) ?? [];
    return;
  }

  const delta = ensureAmount(action);
  target.currentValue = Math.max(
    0,
    mutateValue(target.currentValue, delta, action.verb)
  );
}

function adjustLiability(plan: FinancialPlanPayload, action: IntentAction) {
  let target = matchEntity(plan.liabilities ?? [], action.target);
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

  if (action.verb === "remove" && action.amount == null) {
    plan.liabilities =
      plan.liabilities?.filter((liability) => liability.id !== target.id) ??
      [];
    return;
  }

  const delta = ensureAmount(action);
  target.currentBalance = Math.max(
    0,
    mutateValue(target.currentBalance, delta, action.verb)
  );
}

function adjustCashflow(
  plan: FinancialPlanPayload,
  action: IntentAction,
  field: "monthlyIncome" | "monthlyExpenses"
) {
  const amount = ensureAmount(action);
  const summaryField = plan.summary[field];
  const nextValue = Math.max(
    0,
    mutateValue(summaryField, amount, action.verb, { removeZero: true })
  );
  plan.summary[field] = nextValue;
  plan.cashflow!.summary[field] = nextValue;
}

function mutateValue(
  current: number,
  delta: number,
  verb: IntentAction["verb"],
  options?: { removeZero?: boolean }
) {
  switch (verb) {
    case "add":
    case "increase":
      return current + delta;
    case "reduce":
      return current - delta;
    case "remove":
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
  plan.cashflow!.summary.netMonthly =
    plan.summary.monthlySavings;
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
    (action.verb === "add" || action.verb === "increase") &&
    typeof action.amount === "number"
  );
}

function deriveEntityName(
  target: string | null | undefined,
  fallback: string
) {
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
