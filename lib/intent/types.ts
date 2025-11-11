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

export type IntentActionCandidate = Omit<IntentAction, "id">;
