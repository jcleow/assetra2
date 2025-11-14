import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock fetch at the top level
const mockFetch = vi.fn(async (input: RequestInfo | URL) => {
  const url = typeof input === "string" ? input : input.toString();
  if (url.includes("/api/property-planner")) {
    return {
      ok: true,
      json: async () => [
        {
          id: "planner-1",
          type: "hdb",
          headline: "Sample HDB Scenario",
          subheadline: "Demo",
          lastRefreshed: "today",
          inputs: {
            loanAmount: 480000,
            loanTermYears: 25,
            borrowerType: "single",
            loanStartMonth: "2025-06",
            fixedYears: 5,
            fixedRate: 2.6,
            floatingRate: 4.1,
            householdIncome: 10500,
            otherDebt: 0,
          },
          amortization: { balancePoints: [], composition: [] },
          snapshot: {
            monthlyPayment: 0,
            totalInterest: 0,
            loanEndDate: "",
            msrRatio: 0,
          },
          summary: [],
          timeline: [],
          milestones: [],
          insights: [],
          updatedAt: new Date().toISOString(),
        },
      ],
    } as Response;
  }
  return {
    ok: true,
    json: async () => ({
      assets: [{ name: "house", currentValue: 500_000 }],
      liabilities: [{ name: "mortgage", currentBalance: 350_000 }],
      incomes: [{ source: "salary", amount: 8500 }],
      expenses: [{ payee: "rent", amount: 2500 }],
    }),
  } as Response;
});
vi.stubGlobal("fetch", mockFetch);

vi.mock("@/lib/intent/llm", () => ({
  inferIntentActions: vi.fn(),
}));

import { inferIntentActions } from "@/lib/intent/llm";
import { IntentParseError, parseIntent } from "@/lib/intent/parser";

const mockedInfer = vi.mocked(inferIntentActions);

describe("intent parser", () => {
  beforeEach(() => {
    mockedInfer.mockReset();
    mockFetch.mockClear();
  });

  it("maps LLM extracted actions into IntentAction objects", async () => {
    mockedInfer.mockResolvedValue([
      {
        verb: "add-item",
        entity: "asset",
        target: "Brokerage account",
        amount: 5000,
        currency: "USD",
        raw: "Add $5,000 to my brokerage account",
      },
    ]);

    const result = await parseIntent("Add $5,000 to my brokerage account");

    expect(mockedInfer).toHaveBeenCalledWith(
      "Add $5,000 to my brokerage account",
      expect.any(String)
    );
    expect(result.actions).toHaveLength(1);
    const [action] = result.actions;
    expect(action.id).toBeTruthy();
    expect(action).toMatchObject({
      verb: "add-item",
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
        verb: "update",
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

  it("filters property planner actions without planner keywords", async () => {
    mockedInfer.mockResolvedValue([
      {
        verb: "update",
        entity: "property-planner",
        target: "loan amount",
        amount: 800000,
        currency: null,
        raw: "set loan amount",
        metadata: {
          plannerScenarioType: "hdb",
          plannerField: "loanAmount",
        },
      },
    ]);

    const result = await parseIntent("increase my assets");
    expect(result.actions).toHaveLength(0);
  });

  it("keeps property planner actions when planner is referenced", async () => {
    mockedInfer.mockResolvedValue([
      {
        verb: "update",
        entity: "property-planner",
        target: "loan amount",
        amount: 900000,
        currency: null,
        raw: "Set HDB planner loan amount to 900k",
        metadata: {
          plannerScenarioType: "hdb",
          plannerField: "loanAmount",
        },
      },
    ]);

    const result = await parseIntent(
      "In the property planner, set the HDB loan amount to 900k"
    );
    expect(result.actions).toHaveLength(1);
    expect(result.actions[0].entity).toBe("property-planner");
  });
});
