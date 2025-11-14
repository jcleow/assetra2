import { nanoid } from "nanoid";

import { inferIntentActions } from "./llm";
import type {
  IntentAction,
  IntentActionCandidate,
  IntentResult,
} from "./types";
import type { PropertyPlannerScenario } from "@/lib/financial/types";

const PROPERTY_PLANNER_KEYWORDS = [
  "property planner",
  "mortgage planner",
  "housing planner",
  "planner scenario",
  "mortgage scenario",
  "bto scenario",
  "hdb scenario",
] as const;
const PROPERTY_TERMS = [
  "planner",
  "scenario",
  "mortgage",
  "property",
  "housing",
  "bto",
  "hdb",
  "condo",
  "landed",
] as const;

interface FinancialPlanData {
  assets: Array<{ name: string; currentValue: number }>;
  liabilities: Array<{ name: string; currentBalance: number }>;
  incomes: Array<{ source: string; amount: number }>;
  expenses: Array<{ payee: string; amount: number }>;
}

function resolveBaseUrl() {
  return process.env.NEXTAUTH_URL || "http://localhost:3000";
}

async function fetchFinancialContext(): Promise<string> {
  try {
    const baseUrl = resolveBaseUrl();
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

async function fetchPropertyPlannerContext(): Promise<string> {
  try {
    const baseUrl = resolveBaseUrl();
    const response = await fetch(`${baseUrl}/api/property-planner`);
    if (!response.ok) {
      return "";
    }
    const data = (await response.json()) as PropertyPlannerScenario[];
    if (!Array.isArray(data) || data.length === 0) {
      return "";
    }
    return formatPropertyPlannerContext(data);
  } catch (error) {
    console.warn("Error fetching property planner context:", error);
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

function formatPropertyPlannerContext(
  scenarios: PropertyPlannerScenario[]
): string {
  const sections = scenarios.map((scenario) => {
    const loanAmount = scenario.inputs.loanAmount.toLocaleString();
    const tenure = scenario.inputs.loanTermYears;
    return `${scenario.type.toUpperCase()}: ${scenario.headline} — Loan ${loanAmount}, ${tenure} year term`;
  });
  if (sections.length === 0) {
    return "";
  }
  return `Property Planner:\n${sections.join("\n")}`;
}

function isPropertyPlannerMessage(message: string) {
  const normalized = message.toLowerCase();
  if (
    PROPERTY_PLANNER_KEYWORDS.some((keyword) =>
      normalized.includes(keyword)
    )
  ) {
    return true;
  }
  const hasPlannerOrScenario =
    normalized.includes("planner") || normalized.includes("scenario");
  if (!hasPlannerOrScenario) {
    return false;
  }
  return PROPERTY_TERMS.some((term) => normalized.includes(term));
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
    const [financialContext, plannerContext] = await Promise.all([
      fetchFinancialContext(),
      fetchPropertyPlannerContext(),
    ]);
    const combinedContext = [financialContext, plannerContext]
      .filter(Boolean)
      .join("\n\n");

    const llmActions = await inferIntentActions(
      trimmed,
      combinedContext.length > 0 ? combinedContext : undefined
    );
    const guardedActions = guardPlannerActions(trimmed, llmActions);
    const actions = guardedActions.map((action) =>
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
    metadata: action.metadata,
  };
}

function guardPlannerActions(
  message: string,
  actions: IntentActionCandidate[] | undefined
) {
  if (!Array.isArray(actions) || actions.length === 0) {
    return actions ?? [];
  }
  if (isPropertyPlannerMessage(message)) {
    return actions;
  }
  return actions.filter((action) => action.entity !== "property-planner");
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
