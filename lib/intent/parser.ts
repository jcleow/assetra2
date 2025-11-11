import { nanoid } from "nanoid";

import { inferIntentActions } from "./llm";
import type {
  IntentAction,
  IntentActionCandidate,
  IntentResult,
} from "./types";

export type { IntentVerb, IntentEntity, IntentResult } from "./types";
export type { IntentAction } from "./types";

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
    const llmActions = await inferIntentActions(trimmed);
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
