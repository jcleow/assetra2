import { describe, expect, it, beforeEach, vi } from "vitest";

vi.mock("@/lib/intent/llm", () => ({
  inferIntentActions: vi.fn(),
}));

import { inferIntentActions } from "@/lib/intent/llm";
import { parseIntent, IntentParseError } from "@/lib/intent/parser";

const mockedInfer = vi.mocked(inferIntentActions);

describe("intent parser", () => {
  beforeEach(() => {
    mockedInfer.mockReset();
  });

  it("maps LLM extracted actions into IntentAction objects", async () => {
    mockedInfer.mockResolvedValue([
      {
        verb: "add",
        entity: "asset",
        target: "Brokerage account",
        amount: 5000,
        currency: "USD",
        raw: "Add $5,000 to my brokerage account",
      },
    ]);

    const result = await parseIntent("Add $5,000 to my brokerage account");

    expect(mockedInfer).toHaveBeenCalledWith(
      "Add $5,000 to my brokerage account"
    );
    expect(result.actions).toHaveLength(1);
    const [action] = result.actions;
    expect(action.id).toBeTruthy();
    expect(action).toMatchObject({
      verb: "add",
      entity: "asset",
      target: "Brokerage account",
      amount: 5000,
      currency: "USD",
      raw: "Add $5,000 to my brokerage account",
    });
  });

  it("normalizes currency casing and amount values", async () => {
    mockedInfer.mockResolvedValue([
      {
        verb: "increase",
        entity: "expense",
        target: "rent",
        amount: -2500,
        currency: "usd",
        raw: "increase rent payments",
      },
    ]);

    const result = await parseIntent("increase rent payments");

    expect(result.actions[0].amount).toBe(2500);
    expect(result.actions[0].currency).toBe("USD");
  });

  it("throws on empty input", async () => {
    await expect(parseIntent("   ")).rejects.toThrow(IntentParseError);
  });

  it("wraps llm errors in IntentParseError", async () => {
    mockedInfer.mockRejectedValue(new Error("upstream failure"));

    await expect(parseIntent("Add 100 to savings")).rejects.toThrow(
      IntentParseError
    );
  });
});
