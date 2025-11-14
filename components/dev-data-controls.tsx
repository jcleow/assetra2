"use client";

import { Loader2, Sparkles, Trash2 } from "lucide-react";
import { useState } from "react";

import { toast } from "@/components/toast";
import { useFinancialPlanningStore } from "@/features/financial-planning/store";
import { usePropertyPlannerStore } from "@/features/property-planner/store";
import type { PropertyPlannerScenario } from "@/lib/financial/types";
import type { FinancialPlanPayload } from "@/lib/financial/plan-schema";

type ActionType = "populate" | "clear";

type PopulateResponse = {
  status: string;
  snapshot?: FinancialPlanPayload;
  plannerScenarios?: PropertyPlannerScenario[];
};

export function DevDataControls() {
  const { refreshData, setFinancialPlan } = useFinancialPlanningStore(
    (state) => ({
      refreshData: state.refreshData,
      setFinancialPlan: state.setFinancialPlan,
    })
  );
  const { fetch: fetchPlannerScenarios, hydrateScenarios } =
    usePropertyPlannerStore((state) => ({
      fetch: state.fetch,
      hydrateScenarios: state.hydrateScenarios,
    }));
  const [pending, setPending] = useState<ActionType | null>(null);

  const runAction = async (action: ActionType) => {
    try {
      setPending(action);
      const response = await fetch(`/api/dev/financial-plan/${action}`, {
        method: "POST",
      });
      if (!response.ok) {
        throw new Error(`Request failed (${response.status})`);
      }
      const payload: PopulateResponse = await response.json();
      if (payload.status === "fallback") {
        if (payload.snapshot) {
          setFinancialPlan(payload.snapshot);
        }
        if (payload.plannerScenarios) {
          hydrateScenarios(payload.plannerScenarios);
        } else {
          hydrateScenarios([]);
        }
      } else {
        await refreshData();
        await fetchPlannerScenarios();
      }
      toast({
        type: "success",
        description:
          action === "populate"
            ? "Loaded default financial data."
            : "Cleared all financial data.",
      });
    } catch (error) {
      console.error(`Failed to ${action} financial data`, error);
      toast({
        type: "error",
        description:
          action === "populate"
            ? "Unable to load default data."
            : "Unable to clear data.",
      });
    } finally {
      setPending(null);
    }
  };

  const renderIcon = (action: ActionType) => {
    if (pending === action) {
      return <Loader2 className="h-4 w-4 animate-spin" />;
    }
    return action === "populate" ? (
      <Sparkles className="h-4 w-4" />
    ) : (
      <Trash2 className="h-4 w-4" />
    );
  };

  return (
    <div className="flex items-center gap-2">
      <button
        aria-label="Load default data"
        className="flex h-8 w-8 items-center justify-center rounded-full border border-white/15 text-white/80 transition hover:bg-white/10"
        disabled={pending !== null}
        onClick={() => runAction("populate")}
        type="button"
      >
        {renderIcon("populate")}
      </button>
      <button
        aria-label="Clear all data"
        className="flex h-8 w-8 items-center justify-center rounded-full border border-white/15 text-white/80 transition hover:bg-white/10"
        disabled={pending !== null}
        onClick={() => runAction("clear")}
        type="button"
      >
        {renderIcon("clear")}
      </button>
    </div>
  );
}
