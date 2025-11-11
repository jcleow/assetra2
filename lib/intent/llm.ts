import { generateObject } from "ai";
import { z } from "zod";

import { myProvider } from "@/lib/ai/providers";
import type { IntentActionCandidate } from "./types";

const INTENT_VERBS = ["add", "increase", "reduce", "remove"] as const;
const INTENT_ENTITIES = ["asset", "liability", "income", "expense"] as const;

const INTENT_SYSTEM_PROMPT = `\
You convert user chat commands into structured financial plan intent actions.

Rules:
- Only create an action when the user explicitly asks to modify their plan.
- Supported verbs: add, increase, reduce, remove. Never invent other verbs.
- Supported entities: asset, liability, income, expense. Pick the best match.
- Amounts must be positive numbers representing the magnitude of change. Use null if no amount is provided.
- Currency should be a 3-letter ISO code (USD, EUR, GBP, etc.) when explicitly mentioned. Otherwise set it to null.
- Target is the described account or category (e.g., "savings account", "mortgage").
- Raw is the exact text span from the user message that led to the action.
- When a single message contains multiple changes, return one action per change.
- If nothing actionable is found, return an empty actions array.
`;

const IntentLLMActionSchema = z.object({
  verb: z.enum(INTENT_VERBS),
  entity: z.enum(INTENT_ENTITIES),
  target: z.string().min(1),
  amount: z.number().finite().nullable(),
  currency: z
    .union([z.string().length(3), z.null()])
    .transform((value) => (typeof value === "string" ? value.toUpperCase() : null)),
  raw: z.string().min(1),
});

const IntentLLMResponseSchema = z.object({
  actions: z.array(IntentLLMActionSchema),
});

const buildPrompt = (message: string) => `\
User request:
"""
${message}
"""

Extract the structured actions.`;

export async function inferIntentActions(
  message: string
): Promise<IntentActionCandidate[]> {
  const { object } = await generateObject({
    model: myProvider.languageModel("chat-model-reasoning"),
    system: INTENT_SYSTEM_PROMPT,
    prompt: buildPrompt(message),
    temperature: 0,
    schema: IntentLLMResponseSchema,
  });

  return object.actions ?? [];
}
