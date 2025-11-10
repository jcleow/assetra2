import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/components/toast", () => ({
  toast: vi.fn(),
}));

const mockStateRef: {
  current: any;
} = { current: null };
const mockSetFinancialPlan = vi.fn();
const mockRunProjection = vi.fn();

vi.mock("@/features/financial-planning/store", () => ({
  useFinancialPlanningStore: {
    getState: () => mockStateRef.current,
  },
}));

import { dispatchIntentActions, IntentDispatchError } from "@/features/financial-planning/intent-dispatcher";

const basePlan = {
  assets: [
    {
      id: "asset-1",
      name: "Stocks",
      category: "brokerage",
      currentValue: 10_000,
      annualGrowthRate: 0.07,
      notes: null,
      updatedAt: new Date().toISOString(),
    },
  ],
  liabilities: [
    {
      id: "liability-1",
      name: "Mortgage",
      category: "mortgage",
      currentBalance: 200_000,
      interestRateApr: 0.035,
      minimumPayment: 1800,
      notes: null,
      updatedAt: new Date().toISOString(),
    },
  ],
  incomes: [],
  expenses: [],
  cashflow: {
    summary: {
      monthlyIncome: 8_000,
      monthlyExpenses: 3_000,
      netMonthly: 5_000,
    },
    breakdown: {},
  },
  summary: {
    totalAssets: 10_000,
    totalLiabilities: 200_000,
    netWorth: -190_000,
    monthlyIncome: 8_000,
    monthlyExpenses: 3_000,
    monthlySavings: 5_000,
    savingsRate: 0.625,
  },
  lastUpdated: new Date().toISOString(),
};

beforeEach(() => {
  mockSetFinancialPlan.mockReset();
  mockRunProjection.mockReset().mockResolvedValue(undefined);
  mockStateRef.current = {
    financialPlan: structuredClone(basePlan),
    setFinancialPlan: mockSetFinancialPlan,
    runProjection: mockRunProjection,
  };
  vi.spyOn(global, "fetch").mockResolvedValue({
    ok: true,
    json: async () => ({}),
    text: async () => "",
  } as Response);
});

describe("dispatchIntentActions", () => {
  it("mutates financial plan and emits audits", async () => {
    const actions = [
      {
        id: "a1",
        verb: "add" as const,
        entity: "asset" as const,
        target: "stocks",
        amount: 5_000,
        currency: "USD",
        raw: "Add 5k to stocks",
      },
      {
        id: "a2",
        verb: "increase" as const,
        entity: "expense" as const,
        target: "rent",
        amount: 200,
        currency: "USD",
        raw: "Increase expenses",
      },
    ];

    await dispatchIntentActions({
      intentId: "intent-success",
      chatId: "chat-1",
      actions,
    });

    expect(mockSetFinancialPlan).toHaveBeenCalledTimes(1);
    const updatedPlan = mockSetFinancialPlan.mock.calls[0][0];
    expect(updatedPlan.assets[0].currentValue).toBe(15_000);
    expect(updatedPlan.summary.totalAssets).toBe(15_000);
    expect(updatedPlan.summary.monthlyExpenses).toBe(3_200);
    expect(mockRunProjection).toHaveBeenCalledTimes(1);
    expect(global.fetch).toHaveBeenCalledTimes(actions.length);
  });

  it("throws when plan is missing", async () => {
    mockStateRef.current = {
      financialPlan: null,
    };

    await expect(
      dispatchIntentActions({
        intentId: "missing",
        actions: [
          {
            id: "a1",
            verb: "add",
            entity: "asset",
            target: "stocks",
            amount: 100,
            raw: "",
            currency: "USD",
          },
        ],
      })
    ).rejects.toThrow(IntentDispatchError);
  });

  it("rejects unknown targets", async () => {
    await expect(
      dispatchIntentActions({
        intentId: "unknown-target",
        actions: [
          {
            id: "a1",
            verb: "add",
            entity: "asset",
            target: "unknown",
            amount: 100,
            currency: "USD",
            raw: "",
          },
        ],
      })
    ).rejects.toThrow(IntentDispatchError);

    expect(mockSetFinancialPlan).not.toHaveBeenCalled();
  });
});
