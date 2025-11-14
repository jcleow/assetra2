import { create } from "zustand";

import { toast } from "@/components/toast";
import { financialClient } from "@/lib/financial/client";
import type {
  PropertyPlannerScenario,
  PropertyPlannerScenarioCreatePayload,
  PropertyPlannerScenarioUpdatePayload,
} from "@/lib/financial/types";
import type { PropertyPlannerType } from "@/components/property-planner/mock-data";

type ScenarioMap = Partial<Record<PropertyPlannerType, PropertyPlannerScenario>>;

interface PropertyPlannerState {
  scenarios: ScenarioMap;
  isLoading: boolean;
  hasFetched: boolean;
  error: string | null;
  fetch: () => Promise<void>;
  saveScenario: (scenario: PropertyPlannerScenario) => Promise<void>;
  isOverviewComplete: boolean;
  setOverviewComplete: (complete: boolean) => void;
}

export const usePropertyPlannerStore = create<PropertyPlannerState>(
  (set, get) => ({
    scenarios: {},
    isLoading: false,
    hasFetched: false,
    error: null,
    isOverviewComplete: false,
    fetch: async () => {
      if (get().isLoading || get().hasFetched) {
        return;
      }
      set({ isLoading: true, error: null });
      try {
        const data = await financialClient.propertyPlanner.list();
        const map: ScenarioMap = {};
        for (const scenario of data) {
          const type = scenario.type as PropertyPlannerType;
          map[type] = scenario;
        }
        set((state) => ({
          scenarios: { ...state.scenarios, ...map },
          isLoading: false,
          hasFetched: true,
        }));
      } catch (error) {
        console.error("Failed to load property planner scenarios", error);
        set({
          error: "Failed to load property planner scenarios",
          isLoading: false,
        });
      }
    },
    saveScenario: async (scenario) => {
      const type = scenario.type as PropertyPlannerType;
      const previous = get().scenarios[type];
      set((state) => ({
        scenarios: { ...state.scenarios, [type]: scenario },
      }));

      try {
        const payload =
          scenario.id?.length ?? 0 > 0
            ? stripServerFields(
                scenario
              ) as PropertyPlannerScenarioUpdatePayload
            : stripServerFields(
                scenario
              ) as PropertyPlannerScenarioCreatePayload;
        const saved =
          scenario.id && scenario.id.length > 0
            ? await financialClient.propertyPlanner.update(payload)
            : await financialClient.propertyPlanner.create(payload);
        set((state) => ({
          scenarios: { ...state.scenarios, [type]: saved },
        }));
      } catch (error) {
        console.error("Failed to save property planner scenario", error);
        set((state) => ({
          scenarios: previous
            ? { ...state.scenarios, [type]: previous }
            : state.scenarios,
        }));
        toast({
          type: "error",
          description:
            "Unable to save your mortgage planner changes. Please try again.",
        });
      }
    },
    setOverviewComplete: (complete) => set({ isOverviewComplete: complete }),
  })
);

function stripServerFields(
  scenario: PropertyPlannerScenario
): Omit<PropertyPlannerScenario, "updatedAt"> {
  const { updatedAt: _updatedAt, ...rest } = scenario;
  return rest;
}
