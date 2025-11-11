import { act, renderHook, waitFor } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import { setupServer } from "msw/node";
import type { ReactNode } from "react";
import { SWRConfig } from "swr";
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { toast } from "@/components/toast";
import {
  useAssets,
  useCashFlowSnapshot,
  useExpenses,
  useIncomes,
  useLiabilities,
} from "@/hooks/use-financial-data";
import {
  type Asset,
  type AssetCreatePayload,
  type AssetUpdatePayload,
  type CashFlowSnapshot,
  type Expense,
  type ExpenseCreatePayload,
  FinancialClientError,
  type Income,
  type IncomeCreatePayload,
  type Liability,
  type LiabilityCreatePayload,
} from "@/lib/financial";

// Mock toast function
vi.mock("@/components/toast", () => ({
  toast: vi.fn(),
}));

// Mock generateUUID
vi.mock("@/lib/utils", () => ({
  generateUUID: () => "mock-uuid-123",
}));

const mockToast = vi.mocked(toast);

// Test fixtures
const sampleAsset: Asset = {
  id: "asset-1",
  name: "Investment Account",
  category: "brokerage",
  currentValue: 50_000,
  annualGrowthRate: 0.07,
  notes: "401k account",
  updatedAt: "2024-01-01T00:00:00.000Z",
};

const sampleLiability: Liability = {
  id: "liability-1",
  name: "Credit Card",
  category: "credit-card",
  currentBalance: 5000,
  interestRateApr: 0.18,
  minimumPayment: 100,
  notes: "Chase Sapphire",
  updatedAt: "2024-01-01T00:00:00.000Z",
};

const sampleIncome: Income = {
  id: "income-1",
  source: "Salary",
  amount: 8000,
  frequency: "monthly",
  startDate: "2024-01-01T00:00:00.000Z",
  category: "employment",
  notes: "Full-time job",
  updatedAt: "2024-01-01T00:00:00.000Z",
};

const sampleExpense: Expense = {
  id: "expense-1",
  payee: "Rent",
  amount: 2000,
  frequency: "monthly",
  category: "housing",
  notes: "Monthly rent payment",
  updatedAt: "2024-01-01T00:00:00.000Z",
};

const sampleCashFlowSnapshot: CashFlowSnapshot = {
  incomes: [sampleIncome],
  expenses: [sampleExpense],
  summary: {
    monthlyIncome: 8000,
    monthlyExpenses: 2000,
    netMonthly: 6000,
  },
};

// Setup MSW server
const server = setupServer();

beforeAll(() => {
  server.listen({ onUnhandledRequest: "bypass" });
});

afterEach(() => {
  server.resetHandlers();
  vi.clearAllMocks();
});

afterAll(() => {
  server.close();
});

// SWR wrapper for testing
function createWrapper() {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <SWRConfig
        value={{
          provider: () => new Map(),
          dedupingInterval: 0,
        }}
      >
        {children}
      </SWRConfig>
    );
  };
}

describe("Financial Hooks - Integration Tests", () => {
  describe("useAssets", () => {
    it("should fetch and return assets successfully", async () => {
      // Mock successful API response
      server.use(
        http.get("*/go-api/assets", () => {
          return HttpResponse.json([sampleAsset]);
        })
      );

      const { result } = renderHook(() => useAssets(), {
        wrapper: createWrapper(),
      });

      // Wait for loading to complete
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Verify data is loaded
      expect(result.current.data).toEqual([sampleAsset]);
      expect(result.current.error).toBeUndefined();
    });

    it("should handle API errors gracefully", async () => {
      // Mock error response
      server.use(
        http.get("*/go-api/assets", () => {
          return HttpResponse.json(
            { error: "Internal server error" },
            { status: 500 }
          );
        })
      );

      const { result } = renderHook(() => useAssets(), {
        wrapper: createWrapper(),
      });

      // Wait for error to be captured
      await waitFor(() => {
        expect(result.current.error).toBeTruthy();
      });

      expect(result.current.data).toBeUndefined();
      expect(result.current.error).toBeInstanceOf(FinancialClientError);
    });

    it("should handle optimistic updates for create operations", async () => {
      // Setup initial empty state
      server.use(
        http.get("*/go-api/assets", () => {
          return HttpResponse.json([]);
        })
      );

      const { result } = renderHook(() => useAssets(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const createPayload: AssetCreatePayload = {
        name: "New Investment",
        category: "brokerage",
        currentValue: 10_000,
        annualGrowthRate: 0.08,
        notes: "New asset for testing",
      };

      // Mock successful create response
      const createdAsset = {
        ...sampleAsset,
        ...createPayload,
        id: "new-asset-123",
      };
      server.use(
        http.post("*/go-api/assets", () => {
          return HttpResponse.json(createdAsset);
        })
      );

      // Test optimistic update
      await act(async () => {
        const created = await result.current.createItem(createPayload);
        expect(created?.id).toBe("new-asset-123");
      });

      // Verify optimistic update worked
      expect(result.current.data).toHaveLength(1);
      expect(result.current.data?.[0].name).toBe("New Investment");
    });

    it("should rollback on create failure and show error toast", async () => {
      server.use(
        http.get("*/go-api/assets", () => {
          return HttpResponse.json([]);
        }),
        http.post("*/go-api/assets", () => {
          return HttpResponse.json(
            { error: "Validation failed" },
            { status: 400 }
          );
        })
      );

      const { result } = renderHook(() => useAssets(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const createPayload: AssetCreatePayload = {
        name: "",
        category: "brokerage",
        currentValue: 10_000,
        annualGrowthRate: 0.08,
      };

      // Test failed create operation
      await act(async () => {
        await expect(
          result.current.createItem(createPayload)
        ).rejects.toThrow();
      });

      // Verify rollback occurred (data should still be empty)
      expect(result.current.data).toEqual([]);

      // Verify error toast was shown
      expect(mockToast).toHaveBeenCalledWith({
        type: "error",
        description: "Validation failed",
      });
    });

    it("should handle update operations with optimistic updates", async () => {
      server.use(
        http.get("*/go-api/assets", () => {
          return HttpResponse.json([sampleAsset]);
        })
      );

      const { result } = renderHook(() => useAssets(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.data).toEqual([sampleAsset]);
      });

      const updatedAsset = { ...sampleAsset, currentValue: 60_000 };
      server.use(
        http.patch(`*/go-api/assets/${sampleAsset.id}`, () => {
          return HttpResponse.json(updatedAsset);
        })
      );

      const updatePayload: AssetUpdatePayload = {
        id: sampleAsset.id,
        currentValue: 60_000,
      };

      await act(async () => {
        const updated = await result.current.updateItem(updatePayload);
        expect(updated?.currentValue).toBe(60_000);
      });

      // Verify optimistic update
      expect(result.current.data?.[0].currentValue).toBe(60_000);
    });

    it("should rollback on update failure", async () => {
      server.use(
        http.get("*/go-api/assets", () => {
          return HttpResponse.json([sampleAsset]);
        }),
        http.patch(`*/go-api/assets/${sampleAsset.id}`, () => {
          return HttpResponse.json({ error: "Update failed" }, { status: 422 });
        })
      );

      const { result } = renderHook(() => useAssets(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.data).toEqual([sampleAsset]);
      });

      const updatePayload: AssetUpdatePayload = {
        id: sampleAsset.id,
        currentValue: 60_000,
      };

      await act(async () => {
        await expect(
          result.current.updateItem(updatePayload)
        ).rejects.toThrow();
      });

      // Verify rollback to original value
      expect(result.current.data?.[0].currentValue).toBe(
        sampleAsset.currentValue
      );
      expect(mockToast).toHaveBeenCalledWith({
        type: "error",
        description: "Update failed",
      });
    });

    it("should handle delete operations", async () => {
      server.use(
        http.get("*/go-api/assets", () => {
          return HttpResponse.json([sampleAsset]);
        }),
        http.delete(`*/go-api/assets/${sampleAsset.id}`, () => {
          return new HttpResponse(null, { status: 204 });
        })
      );

      const { result } = renderHook(() => useAssets(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.data).toEqual([sampleAsset]);
      });

      await act(async () => {
        await result.current.deleteItem(sampleAsset.id);
      });

      expect(result.current.data).toEqual([]);
    });
  });

  describe("useLiabilities", () => {
    it("should fetch and return liabilities", async () => {
      server.use(
        http.get("*/go-api/liabilities", () => {
          return HttpResponse.json([sampleLiability]);
        })
      );

      const { result } = renderHook(() => useLiabilities(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.data).toEqual([sampleLiability]);
      });
    });

    it("should handle liability creation", async () => {
      server.use(
        http.get("*/go-api/liabilities", () => {
          return HttpResponse.json([]);
        }),
        http.post("*/go-api/liabilities", () => {
          return HttpResponse.json({
            ...sampleLiability,
            id: "new-liability-123",
          });
        })
      );

      const { result } = renderHook(() => useLiabilities(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const createPayload: LiabilityCreatePayload = {
        name: "New Credit Card",
        category: "credit-card",
        currentBalance: 2000,
        interestRateApr: 0.15,
        minimumPayment: 50,
        notes: "New card",
      };

      await act(async () => {
        const created = await result.current.createItem(createPayload);
        expect(created?.id).toBe("new-liability-123");
      });

      expect(result.current.data).toHaveLength(1);
    });
  });

  describe("useIncomes", () => {
    it("should fetch and return incomes", async () => {
      server.use(
        http.get("*/go-api/cashflow/incomes", () => {
          return HttpResponse.json([sampleIncome]);
        })
      );

      const { result } = renderHook(() => useIncomes(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.data).toEqual([sampleIncome]);
      });
    });

    it("should handle income creation", async () => {
      server.use(
        http.get("*/go-api/cashflow/incomes", () => {
          return HttpResponse.json([]);
        }),
        http.post("*/go-api/cashflow/incomes", () => {
          return HttpResponse.json({
            ...sampleIncome,
            id: "new-income-123",
          });
        })
      );

      const { result } = renderHook(() => useIncomes(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const createPayload: IncomeCreatePayload = {
        source: "Freelance",
        amount: 3000,
        frequency: "monthly",
        startDate: "2024-01-01T00:00:00.000Z",
        category: "freelance",
        notes: "Side income",
      };

      await act(async () => {
        const created = await result.current.createItem(createPayload);
        expect(created?.id).toBe("new-income-123");
      });

      expect(result.current.data).toHaveLength(1);
    });
  });

  describe("useExpenses", () => {
    it("should fetch and return expenses", async () => {
      server.use(
        http.get("*/go-api/cashflow/expenses", () => {
          return HttpResponse.json([sampleExpense]);
        })
      );

      const { result } = renderHook(() => useExpenses(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.data).toEqual([sampleExpense]);
      });
    });

    it("should handle expense creation", async () => {
      server.use(
        http.get("*/go-api/cashflow/expenses", () => {
          return HttpResponse.json([]);
        }),
        http.post("*/go-api/cashflow/expenses", () => {
          return HttpResponse.json({
            ...sampleExpense,
            id: "new-expense-123",
          });
        })
      );

      const { result } = renderHook(() => useExpenses(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const createPayload: ExpenseCreatePayload = {
        payee: "Utilities",
        amount: 200,
        frequency: "monthly",
        category: "utilities",
        notes: "Monthly utilities",
      };

      await act(async () => {
        const created = await result.current.createItem(createPayload);
        expect(created?.id).toBe("new-expense-123");
      });

      expect(result.current.data).toHaveLength(1);
    });
  });

  describe("useCashFlowSnapshot", () => {
    it("should fetch and return cash flow snapshot", async () => {
      server.use(
        http.get("*/go-api/cashflow", () => {
          return HttpResponse.json(sampleCashFlowSnapshot);
        })
      );

      const { result } = renderHook(() => useCashFlowSnapshot(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.data).toEqual(sampleCashFlowSnapshot);
      });
    });

    it("should handle cash flow errors", async () => {
      server.use(
        http.get("*/go-api/cashflow", () => {
          return HttpResponse.json(
            { error: "Service unavailable" },
            { status: 503 }
          );
        })
      );

      const { result } = renderHook(() => useCashFlowSnapshot(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.error).toBeInstanceOf(FinancialClientError);
      });

      expect(result.current.data).toBeUndefined();
    });
  });

  describe("Error Handling & Toast Messages", () => {
    it("should format FinancialClientError with details correctly", async () => {
      server.use(
        http.get("*/go-api/assets", () => {
          return HttpResponse.json([]);
        }),
        http.post("*/go-api/assets", () => {
          return HttpResponse.json(
            { error: "Name is required" },
            { status: 400 }
          );
        })
      );

      const { result } = renderHook(() => useAssets(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const createPayload: AssetCreatePayload = {
        name: "",
        category: "brokerage",
        currentValue: 1000,
        annualGrowthRate: 0.05,
      };

      await act(async () => {
        await expect(
          result.current.createItem(createPayload)
        ).rejects.toThrow();
      });

      expect(mockToast).toHaveBeenCalledWith({
        type: "error",
        description: "Name is required",
      });
    });

    it("should format generic server errors correctly", async () => {
      server.use(
        http.get("*/go-api/assets", () => {
          return HttpResponse.json([]);
        }),
        http.post("*/go-api/assets", () => {
          return HttpResponse.json("Internal server error", { status: 500 });
        })
      );

      const { result } = renderHook(() => useAssets(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const createPayload: AssetCreatePayload = {
        name: "Test Asset",
        category: "brokerage",
        currentValue: 1000,
        annualGrowthRate: 0.05,
      };

      await act(async () => {
        await expect(
          result.current.createItem(createPayload)
        ).rejects.toThrow();
      });

      expect(mockToast).toHaveBeenCalledWith({
        type: "error",
        description: expect.stringContaining("Request failed (500)"),
      });
    });
  });
});
