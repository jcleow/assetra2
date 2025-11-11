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
const mockRefreshData = vi.fn();

const mockFinancialClient = vi.hoisted(() => ({
  assets: {
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  liabilities: {
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  incomes: {
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  expenses: {
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock("@/features/financial-planning/store", () => ({
  useFinancialPlanningStore: {
    getState: () => mockStateRef.current,
  },
}));
vi.mock("@/lib/financial", async () => {
  const actual =
    await vi.importActual<typeof import("@/lib/financial")>("@/lib/financial");
  return {
    ...actual,
    financialClient: mockFinancialClient,
  };
});

import {
  dispatchIntentActions,
  IntentDispatchError,
} from "@/features/financial-planning/intent-dispatcher";

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
  incomes: [
    {
      id: "income-1",
      source: "Salary",
      category: "employment",
      amount: 8000,
      frequency: "monthly",
      startDate: "2023-01-01T00:00:00.000Z",
      notes: null,
      updatedAt: new Date().toISOString(),
    },
  ],
  expenses: [
    {
      id: "expense-1",
      payee: "Rent",
      category: "housing",
      amount: 2500,
      frequency: "monthly",
      notes: null,
      updatedAt: new Date().toISOString(),
    },
    {
      id: "expense-2",
      payee: "Utilities",
      category: "living",
      amount: 500,
      frequency: "monthly",
      notes: null,
      updatedAt: new Date().toISOString(),
    },
  ],
  cashflow: {
    summary: {
      monthlyIncome: 8000,
      monthlyExpenses: 3000,
      netMonthly: 5000,
    },
    breakdown: {},
  },
  summary: {
    totalAssets: 10_000,
    totalLiabilities: 200_000,
    netWorth: -190_000,
    monthlyIncome: 8000,
    monthlyExpenses: 3000,
    monthlySavings: 5000,
    savingsRate: 0.625,
  },
  lastUpdated: new Date().toISOString(),
};

beforeEach(() => {
  mockSetFinancialPlan.mockReset();
  mockRunProjection.mockReset().mockResolvedValue(undefined);
  mockRefreshData.mockReset().mockResolvedValue(undefined);
  const now = new Date().toISOString();
  mockFinancialClient.assets.create
    .mockReset()
    .mockImplementation(async (payload) => ({
      id: payload.id ?? "asset-created",
      name: payload.name,
      category: payload.category,
      currentValue: payload.currentValue,
      annualGrowthRate: payload.annualGrowthRate,
      notes: payload.notes ?? null,
      updatedAt: now,
    }));
  mockFinancialClient.assets.update
    .mockReset()
    .mockImplementation(async (payload) => ({
      id: payload.id,
      name: payload.name,
      category: payload.category,
      currentValue: payload.currentValue,
      annualGrowthRate: payload.annualGrowthRate,
      notes: payload.notes ?? null,
      updatedAt: now,
    }));
  mockFinancialClient.assets.delete.mockReset().mockResolvedValue(undefined);
  mockFinancialClient.liabilities.create
    .mockReset()
    .mockImplementation(async (payload) => ({
      id: payload.id ?? "liability-created",
      name: payload.name,
      category: payload.category,
      currentBalance: payload.currentBalance,
      interestRateApr: payload.interestRateApr,
      minimumPayment: payload.minimumPayment,
      notes: payload.notes ?? null,
      updatedAt: now,
    }));
  mockFinancialClient.liabilities.update
    .mockReset()
    .mockImplementation(async (payload) => ({
      id: payload.id,
      name: payload.name,
      category: payload.category,
      currentBalance: payload.currentBalance,
      interestRateApr: payload.interestRateApr,
      minimumPayment: payload.minimumPayment,
      notes: payload.notes ?? null,
      updatedAt: now,
    }));
  mockFinancialClient.liabilities.delete
    .mockReset()
    .mockResolvedValue(undefined);
  mockFinancialClient.incomes.create
    .mockReset()
    .mockImplementation(async (payload) => ({
      id: payload.id ?? "income-created",
      source: payload.source,
      category: payload.category,
      amount: payload.amount,
      frequency: payload.frequency,
      startDate: payload.startDate,
      notes: payload.notes ?? null,
      updatedAt: now,
    }));
  mockFinancialClient.incomes.update
    .mockReset()
    .mockImplementation(async (payload) => ({
      id: payload.id,
      source: payload.source,
      category: payload.category,
      amount: payload.amount,
      frequency: payload.frequency,
      startDate: payload.startDate,
      notes: payload.notes ?? null,
      updatedAt: now,
    }));
  mockFinancialClient.incomes.delete.mockReset().mockResolvedValue(undefined);
  mockFinancialClient.expenses.create
    .mockReset()
    .mockImplementation(async (payload) => ({
      id: payload.id ?? "expense-created",
      payee: payload.payee,
      category: payload.category,
      amount: payload.amount,
      frequency: payload.frequency,
      notes: payload.notes ?? null,
      updatedAt: now,
    }));
  mockFinancialClient.expenses.update
    .mockReset()
    .mockImplementation(async (payload) => ({
      id: payload.id,
      payee: payload.payee,
      category: payload.category,
      amount: payload.amount,
      frequency: payload.frequency,
      notes: payload.notes ?? null,
      updatedAt: now,
    }));
  mockFinancialClient.expenses.delete.mockReset().mockResolvedValue(undefined);
  mockStateRef.current = {
    financialPlan: structuredClone(basePlan),
    setFinancialPlan: mockSetFinancialPlan,
    runProjection: mockRunProjection,
    refreshData: mockRefreshData,
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
        verb: "update" as const,
        entity: "asset" as const,
        target: "stocks",
        amount: 15000,
        currency: "USD",
        raw: "Add 5k to stocks",
      },
      {
        id: "a2",
        verb: "update" as const,
        entity: "expense" as const,
        target: "rent",
        amount: 2700,
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
    expect(updatedPlan.summary.monthlyExpenses).toBe(3200);
    expect(mockRunProjection).toHaveBeenCalledTimes(1);
    expect(global.fetch).toHaveBeenCalledTimes(actions.length);
    expect(mockFinancialClient.assets.update).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "asset-1",
        currentValue: 15_000,
      })
    );
    expect(mockFinancialClient.expenses.update).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "expense-1",
        amount: 2700,
      })
    );
    expect(mockRefreshData).toHaveBeenCalled();
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
            verb: "add-item",
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

  it("creates a new asset when target is missing and amount provided", async () => {
    const actions = [
      {
        id: "a1",
        verb: "add-item" as const,
        entity: "asset" as const,
        target: "a new asset called savings account",
        amount: 5000,
        currency: "USD",
        raw: "Add a new asset called savings account with 5k",
      },
    ];

    await dispatchIntentActions({
      intentId: "intent-create-asset",
      actions,
    });

    const updatedPlan = mockSetFinancialPlan.mock.calls[0][0];
    expect(updatedPlan.assets).toHaveLength(2);
    const created = updatedPlan.assets.find(
      (asset: { name: string }) => asset.name === "savings account"
    );
    expect(created).toBeTruthy();
    expect(created?.currentValue).toBe(5000);
    expect(updatedPlan.summary.totalAssets).toBe(15_000);
    expect(mockFinancialClient.assets.create).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "savings account",
        currentValue: 5000,
      })
    );
  });

  it("creates a new liability when target is missing and amount provided", async () => {
    const actions = [
      {
        id: "l1",
        verb: "add-item" as const,
        entity: "liability" as const,
        target: "a new liability called student loan",
        amount: 12_000,
        currency: "USD",
        raw: "Add a new liability called student loan for 12k",
      },
    ];

    await dispatchIntentActions({
      intentId: "intent-create-liability",
      actions,
    });

    const updatedPlan = mockSetFinancialPlan.mock.calls[0][0];
    expect(updatedPlan.liabilities).toHaveLength(2);
    const created = updatedPlan.liabilities.find(
      (liability: { name: string }) => liability.name === "student loan"
    );
    expect(created).toBeTruthy();
    expect(created?.currentBalance).toBe(12_000);
    expect(updatedPlan.summary.totalLiabilities).toBe(212_000);
    expect(mockFinancialClient.liabilities.create).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "student loan",
        currentBalance: 12_000,
      })
    );
  });

  it("creates a new income when target is missing and amount provided", async () => {
    const actions = [
      {
        id: "inc-1",
        verb: "add-item" as const,
        entity: "income" as const,
        target: "a new income called freelance design",
        amount: 1200,
        currency: "USD",
        raw: "Add a new income called freelance design with $1200",
      },
    ];

    await dispatchIntentActions({
      intentId: "intent-create-income",
      actions,
    });

    const updatedPlan = mockSetFinancialPlan.mock.calls[0][0];
    expect(updatedPlan.incomes).toHaveLength(2);
    const created = updatedPlan.incomes.find(
      (income: { source: string }) => income.source === "freelance design"
    );
    expect(created?.amount).toBe(1200);
    expect(updatedPlan.summary.monthlyIncome).toBe(9200);
    expect(updatedPlan.summary.monthlySavings).toBe(6200);
    expect(mockFinancialClient.incomes.create).toHaveBeenCalledWith(
      expect.objectContaining({
        source: "freelance design",
        amount: 1200,
      })
    );
  });

  it("removes an expense when using remove verb without amount", async () => {
    const actions = [
      {
        id: "exp-1",
        verb: "remove-item" as const,
        entity: "expense" as const,
        target: "rent",
        amount: null,
        currency: "USD",
        raw: "Remove rent",
      },
    ];

    await dispatchIntentActions({
      intentId: "intent-remove-expense",
      actions,
    });

    const updatedPlan = mockSetFinancialPlan.mock.calls[0][0];
    expect(updatedPlan.expenses).toHaveLength(1);
    expect(updatedPlan.summary.monthlyExpenses).toBe(500);
    expect(updatedPlan.summary.monthlySavings).toBe(7500);
    expect(mockFinancialClient.expenses.delete).toHaveBeenCalledWith(
      "expense-1"
    );
  });

  it("rejects creation when amount is missing", async () => {
    await expect(
      dispatchIntentActions({
        intentId: "missing-amount",
        actions: [
          {
            id: "a1",
            verb: "add-item",
            entity: "asset",
            target: "new thing",
            amount: null,
            currency: "USD",
            raw: "",
          },
        ],
      })
    ).rejects.toThrow(IntentDispatchError);
  });

  it("rejects unknown targets when verb requires existing entity", async () => {
    await expect(
      dispatchIntentActions({
        intentId: "unknown-target",
        actions: [
          {
            id: "a1",
            verb: "update",
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
    expect(mockFinancialClient.assets.update).not.toHaveBeenCalled();
  });
});
