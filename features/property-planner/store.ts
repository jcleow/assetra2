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
  overviewComplete: Partial<Record<PropertyPlannerType, boolean>>;
  lastSavedAt: Partial<Record<PropertyPlannerType, string>>;
  fetch: () => Promise<void>;
  saveScenario: (
    type: PropertyPlannerType,
    scenario: PropertyPlannerScenario
  ) => Promise<void>;
  deleteScenario: (type: PropertyPlannerType) => Promise<void>;
  hydrateScenarios: (scenarios: PropertyPlannerScenario[]) => void;
  setOverviewComplete: (type: PropertyPlannerType, complete: boolean) => void;
}

export const usePropertyPlannerStore = create<PropertyPlannerState>(
  (set, get) => ({
    scenarios: {},
    isLoading: false,
    hasFetched: false,
    error: null,
    overviewComplete: {},
    lastSavedAt: {},
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
          lastSavedAt: {
            ...state.lastSavedAt,
            ...Object.fromEntries(
              Object.entries(map).map(([type, scenario]) => [
                type,
                scenario?.updatedAt ?? new Date().toISOString(),
              ])
            ),
          },
        }));
      } catch (error) {
        console.error("Failed to load property planner scenarios", error);
        set({
          error: "Failed to load property planner scenarios",
          isLoading: false,
        });
      }
    },
    saveScenario: async (type, scenario) => {
      const previous = get().scenarios[type];
      set((state) => ({
        scenarios: { ...state.scenarios, [type]: scenario },
      }));

      try {
        const payload = stripServerFields(scenario);
        const saved =
          scenario.id && scenario.id.length > 0
            ? await financialClient.propertyPlanner.update(
                payload as PropertyPlannerScenarioUpdatePayload
              )
            : await financialClient.propertyPlanner.create(
                payload as PropertyPlannerScenarioCreatePayload
              );
        set((state) => ({
          scenarios: { ...state.scenarios, [type]: saved },
          lastSavedAt: { ...state.lastSavedAt, [type]: saved.updatedAt },
        }));
        return saved;
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
        throw error;
      }
    },
    deleteScenario: async (type) => {
      const current = get().scenarios[type];
      set((state) => {
        const nextScenarios = { ...state.scenarios };
        delete nextScenarios[type];
        const nextLastSaved = { ...state.lastSavedAt };
        delete nextLastSaved[type];
        const nextOverview = { ...state.overviewComplete };
        delete nextOverview[type];
        return {
          scenarios: nextScenarios,
          lastSavedAt: nextLastSaved,
          overviewComplete: nextOverview,
        };
      });
      try {
        if (current?.id) {
          await financialClient.propertyPlanner.delete(current.id);
        }
      } catch (error) {
        console.error("Failed to delete property planner scenario", error);
        set((state) => ({
          scenarios: current
            ? { ...state.scenarios, [type]: current }
            : state.scenarios,
        }));
        toast({
          type: "error",
          description:
            "Unable to delete your planner scenario. Please try again.",
        });
        throw error;
      }
    },
    hydrateScenarios: (scenarios) => {
      const map: ScenarioMap = {};
      for (const scenario of scenarios) {
        const type = scenario.type as PropertyPlannerType;
        map[type] = scenario;
      }
      set((state) => ({
        scenarios: map,
        hasFetched: true,
        isLoading: false,
        lastSavedAt: Object.fromEntries(
          Object.entries(map).map(([type, scenario]) => [
            type,
            scenario?.updatedAt ?? new Date().toISOString(),
          ])
        ),
        overviewComplete: state.overviewComplete,
      }));
    },
    setOverviewComplete: (type, complete) =>
      set((state) => ({
        overviewComplete: { ...state.overviewComplete, [type]: complete },
      })),
  })
);

function stripServerFields(
  scenario: PropertyPlannerScenario
): Omit<PropertyPlannerScenario, "updatedAt"> {
  const { updatedAt: _updatedAt, ...rest } = scenario;
  return rest;
}
