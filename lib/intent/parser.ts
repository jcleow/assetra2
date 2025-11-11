import { nanoid } from "nanoid";

import { inferIntentActions } from "./llm";
import type {
  IntentAction,
  IntentActionCandidate,
  IntentResult,
} from "./types";

interface FinancialPlanData {
  assets: Array<{ name: string; currentValue: number }>;
  liabilities: Array<{ name: string; currentBalance: number }>;
  incomes: Array<{ source: string; amount: number }>;
  expenses: Array<{ payee: string; amount: number }>;
}

async function fetchFinancialContext(): Promise<string> {
  try {
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const response = await fetch(`${baseUrl}/api/financial-plan?mock=true`);

    if (!response.ok) {
      console.warn("Failed to fetch financial context, proceeding without context");
      return "";
    }

    const data: FinancialPlanData = await response.json();

    return formatFinancialContext(data);
  } catch (error) {
    console.warn("Error fetching financial context:", error);
    return "";
  }
}

function formatFinancialContext(data: FinancialPlanData): string {
  const assets = data.assets
    .map(a => `${a.name}: $${a.currentValue.toLocaleString()}`)
    .join(", ");

  const liabilities = data.liabilities
    .map(l => `${l.name}: $${l.currentBalance.toLocaleString()}`)
    .join(", ");

  const incomes = data.incomes
    .map(i => `${i.source}: $${i.amount.toLocaleString()}/month`)
    .join(", ");

  const expenses = data.expenses
    .map(e => `${e.payee}: $${e.amount.toLocaleString()}/month`)
    .join(", ");

  return `\
Assets: ${assets || "None"}
Liabilities: ${liabilities || "None"}
Income: ${incomes || "None"}
Expenses: ${expenses || "None"}`;
}

export type {
  IntentAction,
  IntentEntity,
  IntentResult,
  IntentVerb,
} from "./types";

export class IntentParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "IntentParseError";
  }
}

export async function parseIntent(message: string): Promise<IntentResult> {
  const trimmed = message?.trim();

  if (!trimmed) {
    throw new IntentParseError("Message is empty");
  }

  try {
    // Fetch current financial context for context-aware parsing
    const financialContext = await fetchFinancialContext();

    const llmActions = await inferIntentActions(trimmed, financialContext);
    const actions = llmActions.map((action) =>
      normalizeAction(action, trimmed)
    );
    return { actions, raw: message };
  } catch (error) {
    if (error instanceof IntentParseError) {
      throw error;
    }
    throw new IntentParseError(
      "Unable to interpret your request. Please try rephrasing."
    );
  }
}

function normalizeAction(
  action: IntentActionCandidate,
  fallbackRaw: string
): IntentAction {
  return {
    id: nanoid(),
    verb: action.verb,
    entity: action.entity,
    target: action.target.trim(),
    amount: normalizeAmount(action.amount),
    currency: normalizeCurrency(action.currency),
    raw: action.raw?.trim() || fallbackRaw,
  };
}

function normalizeAmount(value: number | null): number | null {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return null;
  }
  const absolute = Math.abs(value);
  if (!Number.isFinite(absolute)) {
    return null;
  }
  return Number(absolute);
}

function normalizeCurrency(currency: string | null): string | null {
  if (!currency) {
    return null;
  }
  const normalized = currency.trim().toUpperCase();
  return normalized.length === 3 ? normalized : null;
}
