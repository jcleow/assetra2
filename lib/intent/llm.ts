import { generateObject } from "ai";
import { z } from "zod";

import { myProvider } from "@/lib/ai/providers";
import type { IntentActionCandidate } from "./types";

const INTENT_VERBS = ["add-item", "update", "remove-item"] as const;
const INTENT_ENTITIES = [
  "asset",
  "liability",
  "income",
  "expense",
  "property-planner",
] as const;
const PROPERTY_PLANNER_FIELDS = [
  "headline",
  "subheadline",
  "loanAmount",
  "loanTermYears",
  "loanStartMonth",
  "fixedYears",
  "fixedRate",
  "floatingRate",
  "borrowerType",
  "householdIncome",
  "otherDebt",
] as const;

function buildContextAwarePrompt(financialContext: string): string {
  return `\
You convert user chat commands into structured financial plan intent actions using their current financial state as context.

Current Financial State:
${financialContext}

Rules:
- Supported verbs: "add-item" (create new), "update" (change existing), "remove-item" (delete existing)
- Supported entities: asset, liability, income, expense. Pick the best match.
- Use context to determine if item exists: if exists use "update" or "remove-item", if new use "add-item"
- For updates, calculate the final amount based on user intent and current values:
  * Absolute values: "My house is worth 700k" → amount: 700000
  * Relative additions: "I added 15k to portfolio" (current: 75k) → amount: 90000
  * Relative subtractions: "I paid down mortgage by 15k" (current: 350k) → amount: 335000
  * Complete payoffs: "I paid off completely" → use "remove-item" with amount: null
- Match user terms to existing items using natural language understanding (e.g., "housing loan" = "mortgage")
- Currency should be 3-letter ISO code when mentioned, otherwise null
- Target is the described account/category name
- Raw is the exact text span that led to the action
- When single message has multiple items, return one action per item
- If nothing actionable found, return empty actions array
- Property planner entity:
  * Only emit property-planner actions when the user clearly references the mortgage/property planner or a planner scenario.
  * Use entity "property-planner" with metadata.plannerScenarioType of "hdb", "condo", or "landed" (infer from context).
  * metadata.plannerField must be one of: headline, subheadline, loanAmount, loanTermYears, loanStartMonth, fixedYears, fixedRate, floatingRate, borrowerType, householdIncome, otherDebt.
  * For numeric planner fields store the final number in "amount". For text-based fields set amount to null and place the value in metadata.plannerStringValue (loanStartMonth should be YYYY-MM).
  * "add-item" creates or ensures a planner scenario exists, "update" changes specific fields, and "remove-item" clears the scenario entirely.
`
}

const INTENT_SYSTEM_PROMPT = buildContextAwarePrompt("");

const PlannerMetadataSchema = z
  .object({
    plannerScenarioType: z
      .string()
      .optional()
      .transform((value) => value?.toLowerCase()),
    plannerField: z.enum(PROPERTY_PLANNER_FIELDS).optional(),
    plannerStringValue: z.string().optional(),
  })
  .optional();

const IntentLLMActionSchema = z.object({
  verb: z.enum(INTENT_VERBS),
  entity: z.enum(INTENT_ENTITIES),
  target: z.string().min(1),
  amount: z.number().finite().nullable(),
  currency: z
    .union([z.string().length(3), z.null()])
    .transform((value) =>
      typeof value === "string" ? value.toUpperCase() : null
    ),
  raw: z.string().min(1),
  metadata: PlannerMetadataSchema,
});

const IntentLLMResponseSchema = z.object({
  actions: z.array(IntentLLMActionSchema),
});

const buildPrompt = (message: string) => `\
User request:
"""
${message}
"""

Extract the structured actions using the current financial state context above.`;

export async function inferIntentActions(
  message: string,
  financialContext?: string
): Promise<IntentActionCandidate[]> {
  const systemPrompt = financialContext
    ? buildContextAwarePrompt(financialContext)
    : INTENT_SYSTEM_PROMPT;

  const { object } = await generateObject({
    model: myProvider.languageModel("chat-model-reasoning"),
    system: systemPrompt,
    prompt: buildPrompt(message),
    temperature: 0,
    schema: IntentLLMResponseSchema,
  });

  return object.actions ?? [];
}
