import { nanoid } from "nanoid";

const VERB_ALIASES: Record<string, IntentVerb> = {
  add: "add",
  increase: "increase",
  reduce: "reduce",
  remove: "remove",
};

const ENTITY_KEYWORDS: Record<IntentEntity, string[]> = {
  asset: ["asset", "stock", "portfolio", "investment", "cash", "savings"],
  liability: ["liability", "debt", "loan", "mortgage", "card"],
  income: ["income", "salary", "paycheck", "bonus", "job"],
  expense: ["expense", "spend", "cost", "bill", "subscription"],
};

const TOKEN_SPLIT = /(?:,|\band\b)/gi;

export type IntentVerb = "add" | "increase" | "reduce" | "remove";
export type IntentEntity = "asset" | "liability" | "income" | "expense";

export interface IntentAction {
  id: string;
  verb: IntentVerb;
  entity: IntentEntity;
  target: string;
  amount: number | null;
  currency: string | null;
  raw: string;
}

export interface IntentResult {
  actions: IntentAction[];
  raw: string;
}

export class IntentParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "IntentParseError";
  }
}

export function parseIntent(message: string): IntentResult {
  if (!message || !message.trim()) {
    throw new IntentParseError("Message is empty");
  }

  const sanitized = message.replace(/(\d),(?=\d{3}\b)/g, "$1");

  const clauses = sanitized
    .split(TOKEN_SPLIT)
    .map((clause) => clause.trim())
    .filter(Boolean);

  if (clauses.length === 0) {
    throw new IntentParseError("No actionable phrases found");
  }

  const actions = clauses.map((clause) => parseClause(clause));
  return { actions, raw: message };
}

function parseClause(clause: string): IntentAction {
  const verb = detectVerb(clause);
  const entity = detectEntity(clause);
  const amountInfo = detectAmount(clause);
  const target = detectTarget(clause);

  return {
    id: nanoid(),
    verb,
    entity,
    target,
    amount: amountInfo.amount,
    currency: amountInfo.currency,
    raw: clause,
  };
}

function detectVerb(clause: string): IntentVerb {
  const lower = clause.toLowerCase();
  for (const alias of Object.keys(VERB_ALIASES)) {
    if (lower.includes(alias)) {
      return VERB_ALIASES[alias];
    }
  }
  throw new IntentParseError(`Unable to determine verb for "${clause}"`);
}

function detectEntity(clause: string): IntentEntity {
  const lower = clause.toLowerCase();
  for (const [entity, keywords] of Object.entries(ENTITY_KEYWORDS)) {
    if (keywords.some((keyword) => lower.includes(keyword))) {
      return entity as IntentEntity;
    }
  }
  // heuristics: verbs add/remove default to assets unless keywords say otherwise
  return "asset";
}

function detectAmount(clause: string): { amount: number | null; currency: string | null } {
  const amountMatch = clause.match(/([$€£])?\s?([\d.,]+)(\s?[kmb])?/i);
  if (!amountMatch) {
    return { amount: null, currency: null };
  }

  const [, currencySymbol, numericPart, magnitudePart] = amountMatch;
  let normalized = Number(numericPart.replace(/,/g, ""));

  if (Number.isNaN(normalized)) {
    return { amount: null, currency: currencySymbol ?? null };
  }

  const magnitude = magnitudePart?.trim().toLowerCase();
  if (magnitude === "k") {
    normalized *= 1_000;
  } else if (magnitude === "m") {
    normalized *= 1_000_000;
  } else if (magnitude === "b") {
    normalized *= 1_000_000_000;
  }

  const currency = currencySymbol ? symbolToCurrency(currencySymbol) : "USD";
  return { amount: normalized, currency };
}

function symbolToCurrency(symbol: string): string | null {
  switch (symbol) {
    case "$":
      return "USD";
    case "€":
      return "EUR";
    case "£":
      return "GBP";
    default:
      return null;
  }
}

function detectTarget(clause: string): string {
  const match = clause.match(/to\s+([a-z0-9\s]+)/i);
  if (match) {
    return match[1].trim();
  }

  const afterVerb = clause.split(/\b(add|increase|reduce|remove)\b/i)[2];
  if (afterVerb) {
    return afterVerb.trim();
  }

  return clause.trim();
}
