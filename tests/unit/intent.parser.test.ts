import { describe, expect, it } from "vitest";

import { parseIntent, IntentParseError } from "@/lib/intent/parser";

describe("intent parser", () => {
  it("parses a single add command", () => {
    const result = parseIntent("Add $5,000 to stocks");
    expect(result.actions).toHaveLength(1);
    const action = result.actions[0];
    expect(action.verb).toBe("add");
    expect(action.entity).toBe("asset");
    expect(action.amount).toBe(5000);
    expect(action.currency).toBe("USD");
    expect(action.target.toLowerCase()).toContain("stocks");
  });

  it("parses chained commands separated by and", () => {
    const result = parseIntent("Increase mortgage payment 200 and remove 1k from cash");
    expect(result.actions).toHaveLength(2);
    expect(result.actions[0].verb).toBe("increase");
    expect(result.actions[1].verb).toBe("remove");
  });

  it("supports shorthand magnitudes", () => {
    const result = parseIntent("Reduce debt by 2k");
    expect(result.actions[0].amount).toBe(2000);
  });

  it("throws on empty input", () => {
    expect(() => parseIntent("   ")).toThrow(IntentParseError);
  });
});
