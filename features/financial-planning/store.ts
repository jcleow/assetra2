import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import type { FinancialPlanPayload } from "@/lib/financial/plan-schema";
import type { NetWorthPoint } from "@/lib/financial";
import { requestRunModel } from "@/lib/financial/run-model-client";

export interface NetWorthTimelinePoint {
  age: number;
  year: number;
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  monthlySavings: number;
}

export interface ProjectionSettings {
  currentAge: number;
  retirementAge: number;
  projectionYears: number;
  inflationRate: number;
  averageReturnRate: number;
}

export interface GraphDisplayOptions {
  showAssets: boolean;
  showLiabilities: boolean;
  showNetWorth: boolean;
  showIncome: boolean;
  showExpenses: boolean;
  timeframe: "next5years" | "next10years" | "untilRetirement" | "custom";
  customYears?: number;
}

interface ProjectionMeta {
  durationMs: number;
  assetCount: number;
  liabilityCount: number;
}

interface FinancialPlanningState {
  // Core data
  financialPlan: FinancialPlanPayload | null;
  timeline: NetWorthTimelinePoint[];
  isLoading: boolean;
  error: string | null;
  lastUpdated: string | null;
  isProjecting: boolean;
  projectionError: string | null;
  projectionMeta: ProjectionMeta | null;

  // Settings
  projectionSettings: ProjectionSettings;
  displayOptions: GraphDisplayOptions;

  // Actions
  setFinancialPlan: (plan: FinancialPlanPayload) => void;
  updateProjectionSettings: (settings: Partial<ProjectionSettings>) => void;
  updateDisplayOptions: (options: Partial<GraphDisplayOptions>) => void;
  generateTimeline: () => void;
  runProjection: () => Promise<void>;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearData: () => void;
  refreshData: () => Promise<void>;
  invalidateFinancialData: () => void;
}

const DEFAULT_PROJECTION_SETTINGS: ProjectionSettings = {
  currentAge: 30,
  retirementAge: 65,
  projectionYears: 35,
  inflationRate: 0.03,
  averageReturnRate: 0.07,
};

const DEFAULT_DISPLAY_OPTIONS: GraphDisplayOptions = {
  showAssets: true,
  showLiabilities: true,
  showNetWorth: true,
  showIncome: false,
  showExpenses: false,
  timeframe: "untilRetirement",
};

export const useFinancialPlanningStore = create<FinancialPlanningState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        financialPlan: null,
        timeline: [],
        isLoading: false,
        error: null,
        lastUpdated: null,
        isProjecting: false,
        projectionError: null,
        projectionMeta: null,
        projectionSettings: DEFAULT_PROJECTION_SETTINGS,
        displayOptions: DEFAULT_DISPLAY_OPTIONS,

        // Actions
        setFinancialPlan: (plan) => {
          set(
            {
              financialPlan: plan,
              lastUpdated: plan.lastUpdated,
              error: null,
            },
            false,
            "setFinancialPlan"
          );
          // Auto-generate timeline when new data is set
          get().generateTimeline();
          void get()
            .runProjection()
            .catch(() => {});
        },

        updateProjectionSettings: (settings) => {
          set(
            (state) => ({
              projectionSettings: { ...state.projectionSettings, ...settings },
            }),
            false,
            "updateProjectionSettings"
          );
          // Regenerate timeline with new settings
          get().generateTimeline();
          void get()
            .runProjection()
            .catch(() => {});
        },

        updateDisplayOptions: (options) => {
          set(
            (state) => ({
              displayOptions: { ...state.displayOptions, ...options },
            }),
            false,
            "updateDisplayOptions"
          );
        },

        generateTimeline: () => {
          const { financialPlan, projectionSettings } = get();

          if (!financialPlan) {
            set({ timeline: [] }, false, "generateTimeline");
            return;
          }

          const timeline: NetWorthTimelinePoint[] = [];
          const currentYear = new Date().getFullYear();

          const assetBuckets =
            financialPlan.assets?.map((asset) => ({
              id: asset.id,
              value: asset.currentValue,
              rate:
                typeof asset.annualGrowthRate === "number"
                  ? asset.annualGrowthRate
                  : null,
            })) ?? [];

          const allocatedAssetValue = assetBuckets.reduce(
            (sum, bucket) => sum + bucket.value,
            0
          );

          let unassignedAssets = Math.max(
            financialPlan.summary.totalAssets - allocatedAssetValue,
            0
          );

          const currentLiabilities = financialPlan.summary.totalLiabilities;
          let monthlyIncome = financialPlan.summary.monthlyIncome;
          let monthlyExpenses = financialPlan.summary.monthlyExpenses;
          let savingsForGrowth = monthlyIncome - monthlyExpenses;

          for (
            let year = 0;
            year <= projectionSettings.projectionYears;
            year++
          ) {
            if (year > 0) {
              const yearlySavings = savingsForGrowth * 12;
              unassignedAssets += yearlySavings;

              assetBuckets.forEach((bucket) => {
                const rate =
                  typeof bucket.rate === "number"
                    ? bucket.rate
                    : projectionSettings.averageReturnRate;
                bucket.value *= 1 + rate;
              });

              const fallbackRate =
                assetBuckets.length > 0
                  ? projectionSettings.averageReturnRate
                  : 0.01;
              unassignedAssets *= 1 + fallbackRate;

              monthlyIncome *= 1 + projectionSettings.inflationRate;
              monthlyExpenses *= 1 + projectionSettings.inflationRate;
              savingsForGrowth = monthlyIncome - monthlyExpenses;
            }

            const age = projectionSettings.currentAge + year;
            const projectedYear = currentYear + year;
            const currentAssets =
              assetBuckets.reduce((sum, bucket) => sum + bucket.value, 0) +
              unassignedAssets;
            const netWorth = currentAssets - currentLiabilities;

            timeline.push({
              age,
              year: projectedYear,
              totalAssets: Math.round(currentAssets),
              totalLiabilities: Math.round(currentLiabilities),
              netWorth: Math.round(netWorth),
              monthlyIncome: Math.round(monthlyIncome),
              monthlyExpenses: Math.round(monthlyExpenses),
              monthlySavings: Math.round(savingsForGrowth),
            });
          }

          set({ timeline }, false, "generateTimeline");
        },

        runProjection: async () => {
          const state = get();
          if (!state.financialPlan || state.isProjecting) {
            return;
          }

          set(
            {
              isProjecting: true,
              projectionError: null,
            },
            false,
            "runProjection:start"
          );

          try {
            const payload = buildRunModelPayload(
              state.financialPlan,
              state.projectionSettings
            );
            const response = await requestRunModel(payload);
            const timeline = mapRunModelTimeline(
              response.netWorthTimeline,
              state.projectionSettings,
              state.financialPlan.summary
            );

            set(
              {
                timeline,
                projectionMeta: response.meta,
                projectionError: null,
              },
              false,
              "runProjection:success"
            );
          } catch (error) {
            const message =
              error instanceof Error
                ? error.message
                : "Failed to recompute projections";
            set(
              {
                projectionError: message,
              },
              false,
              "runProjection:error"
            );
          } finally {
            set({ isProjecting: false }, false, "runProjection:finish");
          }
        },

        setLoading: (loading) => {
          set({ isLoading: loading }, false, "setLoading");
        },

        setError: (error) => {
          set({ error }, false, "setError");
        },

        clearData: () => {
          set(
            {
              financialPlan: null,
              timeline: [],
              error: null,
              lastUpdated: null,
            },
            false,
            "clearData"
          );
        },

        refreshData: async () => {
          const { setLoading, setError, setFinancialPlan } = get();

          setLoading(true);
          setError(null);

          try {
            // Force refresh with cache busting
            const timestamp = Date.now();
            const response = await fetch(
              `/api/financial-plan?refresh=true&t=${timestamp}`
            );

            if (!response.ok) {
              const errorData = await response.json();
              throw new Error(
                errorData.message || "Failed to fetch financial plan"
              );
            }

            const data: FinancialPlanPayload = await response.json();
            setFinancialPlan(data);
          } catch (error) {
            const message =
              error instanceof Error ? error.message : "Unknown error occurred";
            setError(message);
          } finally {
            setLoading(false);
          }
        },

        invalidateFinancialData: () => {
          const { refreshData } = get();
          // Force refresh by clearing cache first
          refreshData();
        },
      }),
      {
        name: "financial-planning-store",
        partialize: (state) => ({
          projectionSettings: state.projectionSettings,
          displayOptions: state.displayOptions,
        }),
      }
    ),
    {
      name: "financial-planning",
    }
  )
);

// Convenience hooks
export const useFinancialPlan = () => {
  const store = useFinancialPlanningStore();
  return {
    data: store.financialPlan,
    isLoading: store.isLoading,
    error: store.error,
    lastUpdated: store.lastUpdated,
    refresh: store.refreshData,
    clear: store.clearData,
  };
};

export const useNetWorthTimeline = () => {
  const store = useFinancialPlanningStore();
  return {
    timeline: store.timeline,
    projectionSettings: store.projectionSettings,
    displayOptions: store.displayOptions,
    updateProjectionSettings: store.updateProjectionSettings,
    updateDisplayOptions: store.updateDisplayOptions,
    regenerate: store.generateTimeline,
  };
};

function buildRunModelPayload(
  financialPlan: FinancialPlanPayload,
  projectionSettings: ProjectionSettings
) {
  return {
    assets: financialPlan.assets.map((asset) => ({
      id: asset.id,
      name: asset.name,
      category: asset.category,
      currentValue: asset.currentValue,
      annualGrowthRate: asset.annualGrowthRate,
      notes: asset.notes,
      updatedAt: asset.updatedAt,
    })),
    liabilities: financialPlan.liabilities.map((liability) => ({
      id: liability.id,
      name: liability.name,
      category: liability.category,
      currentBalance: liability.currentBalance,
      interestRateApr: liability.interestRateApr,
      minimumPayment: liability.minimumPayment,
      notes: liability.notes,
      updatedAt: liability.updatedAt,
    })),
    monthlyIncome: financialPlan.summary.monthlyIncome,
    monthlyExpenses: financialPlan.summary.monthlyExpenses,
    currentAge: projectionSettings.currentAge,
    retirementAge: projectionSettings.retirementAge,
    startYear: new Date().getFullYear(),
  };
}

function mapRunModelTimeline(
  points: NetWorthPoint[],
  projectionSettings: ProjectionSettings,
  summary: FinancialPlanPayload["summary"]
): NetWorthTimelinePoint[] {
  return points.map((point, index) => ({
    age: projectionSettings.currentAge + index,
    year: new Date(point.date).getFullYear(),
    totalAssets: Math.round(point.assetsTotal),
    totalLiabilities: Math.round(point.liabilitiesTotal),
    netWorth: Math.round(point.netWorth),
    monthlyIncome: Math.round(summary.monthlyIncome),
    monthlyExpenses: Math.round(summary.monthlyExpenses),
    monthlySavings: Math.round(summary.monthlySavings),
  }));
}
