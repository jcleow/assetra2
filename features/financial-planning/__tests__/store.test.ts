import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { FinancialPlanPayload } from "@/app/api/financial-plan/route";
import {
  useFinancialPlan,
  useFinancialPlanningStore,
  useNetWorthTimeline,
} from "../store";

// Mock fetch
global.fetch = vi.fn();

const mockFinancialPlan: FinancialPlanPayload = {
  assets: [
    {
      id: "asset-1",
      name: "Investment Portfolio",
      category: "brokerage",
      currentValue: 100_000,
      annualGrowthRate: 0.07,
      notes: "Test asset",
      updatedAt: "2024-01-01T00:00:00Z",
    },
  ],
  liabilities: [
    {
      id: "liability-1",
      name: "Mortgage",
      category: "mortgage",
      currentBalance: 300_000,
      interestRateApr: 0.035,
      minimumPayment: 2000,
      notes: "Test liability",
      updatedAt: "2024-01-01T00:00:00Z",
    },
  ],
  incomes: [
    {
      id: "income-1",
      source: "Salary",
      amount: 8000,
      frequency: "monthly",
      startDate: "2024-01-01T00:00:00Z",
      category: "employment",
      updatedAt: "2024-01-01T00:00:00Z",
    },
  ],
  expenses: [
    {
      id: "expense-1",
      payee: "Rent",
      amount: 2500,
      frequency: "monthly",
      category: "housing",
      updatedAt: "2024-01-01T00:00:00Z",
    },
  ],
  cashflow: {
    summary: {
      monthlyIncome: 8000,
      monthlyExpenses: 2500,
      netMonthly: 5500,
    },
    breakdown: {},
  },
  summary: {
    totalAssets: 100_000,
    totalLiabilities: 300_000,
    netWorth: -200_000,
    monthlyIncome: 8000,
    monthlyExpenses: 2500,
    monthlySavings: 5500,
    savingsRate: 0.6875,
  },
  lastUpdated: "2024-01-01T00:00:00Z",
};

describe("Financial Planning Store", () => {
  beforeEach(() => {
    // Reset store state
    useFinancialPlanningStore.getState().clearData();
    vi.clearAllMocks();
  });

  describe("useFinancialPlan hook", () => {
    it("should initialize with empty state", () => {
      const { result } = renderHook(() => useFinancialPlan());

      expect(result.current.data).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.lastUpdated).toBeNull();
    });

    it("should set financial plan data", () => {
      const { result } = renderHook(() => useFinancialPlan());

      act(() => {
        useFinancialPlanningStore
          .getState()
          .setFinancialPlan(mockFinancialPlan);
      });

      expect(result.current.data).toEqual(mockFinancialPlan);
      expect(result.current.lastUpdated).toBe(mockFinancialPlan.lastUpdated);
      expect(result.current.error).toBeNull();
    });

    it("should handle refresh data success", async () => {
      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockFinancialPlan,
      } as Response);

      const { result } = renderHook(() => useFinancialPlan());

      await act(async () => {
        await result.current.refresh();
      });

      expect(result.current.data).toEqual(mockFinancialPlan);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it("should handle refresh data error", async () => {
      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ message: "API Error" }),
      } as Response);

      const { result } = renderHook(() => useFinancialPlan());

      await act(async () => {
        await result.current.refresh();
      });

      expect(result.current.data).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe("API Error");
    });

    it("should clear data", () => {
      const { result } = renderHook(() => useFinancialPlan());

      // Set data first
      act(() => {
        useFinancialPlanningStore
          .getState()
          .setFinancialPlan(mockFinancialPlan);
      });

      expect(result.current.data).toEqual(mockFinancialPlan);

      // Clear data
      act(() => {
        result.current.clear();
      });

      expect(result.current.data).toBeNull();
      expect(result.current.error).toBeNull();
      expect(result.current.lastUpdated).toBeNull();
    });
  });

  describe("useNetWorthTimeline hook", () => {
    it("should initialize with default settings", () => {
      const { result } = renderHook(() => useNetWorthTimeline());

      expect(result.current.timeline).toEqual([]);
      expect(result.current.projectionSettings).toEqual({
        currentAge: 30,
        retirementAge: 65,
        projectionYears: 35,
        inflationRate: 0.03,
        averageReturnRate: 0.07,
      });
      expect(result.current.displayOptions).toEqual({
        showAssets: true,
        showLiabilities: true,
        showNetWorth: true,
        showIncome: false,
        showExpenses: false,
        timeframe: "untilRetirement",
      });
    });

    it("should generate timeline when financial plan is set", () => {
      const { result } = renderHook(() => useNetWorthTimeline());

      act(() => {
        useFinancialPlanningStore
          .getState()
          .setFinancialPlan(mockFinancialPlan);
      });

      expect(result.current.timeline.length).toBeGreaterThan(0);
      expect(result.current.timeline[0]).toMatchObject({
        age: 30,
        totalAssets: 100_000,
        totalLiabilities: 300_000,
        netWorth: -200_000,
        monthlyIncome: 8000,
        monthlyExpenses: 2500,
        monthlySavings: 5500,
      });
    });

    it("should update projection settings", () => {
      const { result } = renderHook(() => useNetWorthTimeline());

      act(() => {
        result.current.updateProjectionSettings({
          currentAge: 25,
          retirementAge: 60,
        });
      });

      expect(result.current.projectionSettings.currentAge).toBe(25);
      expect(result.current.projectionSettings.retirementAge).toBe(60);
    });

    it("should update display options", () => {
      const { result } = renderHook(() => useNetWorthTimeline());

      act(() => {
        result.current.updateDisplayOptions({
          showIncome: true,
          showExpenses: true,
          timeframe: "next5years",
        });
      });

      expect(result.current.displayOptions.showIncome).toBe(true);
      expect(result.current.displayOptions.showExpenses).toBe(true);
      expect(result.current.displayOptions.timeframe).toBe("next5years");
    });

    it("should regenerate timeline when settings change", () => {
      const { result } = renderHook(() => useNetWorthTimeline());

      // Set financial plan first
      act(() => {
        useFinancialPlanningStore
          .getState()
          .setFinancialPlan(mockFinancialPlan);
      });

      const initialTimeline = result.current.timeline;

      // Update settings
      act(() => {
        result.current.updateProjectionSettings({
          averageReturnRate: 0.1, // Higher return rate
        });
      });

      const updatedTimeline = result.current.timeline;

      // Timeline should be different with new return rate
      expect(updatedTimeline).not.toEqual(initialTimeline);
      expect(updatedTimeline.length).toBe(initialTimeline.length);

      // Future projections should be higher with better returns
      const futureIndex = 10;
      if (futureIndex < updatedTimeline.length) {
        expect(updatedTimeline[futureIndex].totalAssets).toBeGreaterThan(
          initialTimeline[futureIndex].totalAssets
        );
      }
    });
  });

  describe("Store actions", () => {
    it("should handle loading states", () => {
      const store = useFinancialPlanningStore.getState();

      act(() => {
        store.setLoading(true);
      });

      expect(useFinancialPlanningStore.getState().isLoading).toBe(true);

      act(() => {
        store.setLoading(false);
      });

      expect(useFinancialPlanningStore.getState().isLoading).toBe(false);
    });

    it("should handle error states", () => {
      const store = useFinancialPlanningStore.getState();

      act(() => {
        store.setError("Test error");
      });

      expect(useFinancialPlanningStore.getState().error).toBe("Test error");

      act(() => {
        store.setError(null);
      });

      expect(useFinancialPlanningStore.getState().error).toBeNull();
    });

    it("should generate timeline with compound growth", () => {
      const store = useFinancialPlanningStore.getState();

      act(() => {
        store.setFinancialPlan(mockFinancialPlan);
      });

      const timeline = useFinancialPlanningStore.getState().timeline;

      // Verify timeline has expected structure
      expect(timeline.length).toBeGreaterThan(0);
      expect(timeline[0].age).toBe(30);
      expect(timeline[0].year).toBe(new Date().getFullYear());

      // Verify growth over time
      if (timeline.length > 10) {
        const earlyPoint = timeline[5];
        const laterPoint = timeline[15];

        expect(laterPoint.totalAssets).toBeGreaterThan(earlyPoint.totalAssets);
        expect(laterPoint.age).toBe(earlyPoint.age + 10);
        expect(laterPoint.year).toBe(earlyPoint.year + 10);
      }
    });
  });
});
