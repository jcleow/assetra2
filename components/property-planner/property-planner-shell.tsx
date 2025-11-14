"use client";

import { useEffect, useState } from "react";
import { Dialog as DialogPrimitive } from "radix-ui";
import { Loader2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  PROPERTY_PLANNER_MOCKS,
  PropertyPlannerType,
} from "./mock-data";
import { MortgageWizard } from "./mortgage-wizard";
import { usePropertyPlannerStore } from "@/features/property-planner/store";

interface PropertyPlannerShellProps {
  activeType: PropertyPlannerType;
}

export function PropertyPlannerShell({
  activeType,
}: PropertyPlannerShellProps) {
  const storedScenario = usePropertyPlannerStore(
    (state) => state.scenarios[activeType]
  );
  const saveScenario = usePropertyPlannerStore((state) => state.saveScenario);
  const hasFetched = usePropertyPlannerStore((state) => state.hasFetched);
  const scenario = storedScenario ?? PROPERTY_PLANNER_MOCKS[activeType];
  const defaultHeadline = PROPERTY_PLANNER_MOCKS[activeType].headline;
  const [locationDraft, setLocationDraft] = useState(scenario.headline);

  useEffect(() => {
    setLocationDraft(scenario.headline);
  }, [scenario.headline]);

  const handleLocationChange = (value: string) => {
    setLocationDraft(value);
  };

  const handleLocationBlur = () => {
    const nextHeadline = locationDraft.trim() || defaultHeadline;
    setLocationDraft(nextHeadline);
    if (nextHeadline === scenario.headline) {
      return;
    }
    if (!hasFetched) {
      return;
    }
    void saveScenario({
      ...scenario,
      type: activeType,
      headline: nextHeadline,
      updatedAt: new Date().toISOString(),
    });
  };

  return (
    <div className="flex h-full w-full min-h-0 flex-col overflow-hidden rounded-3xl border border-white/10 bg-gray-950 text-white shadow-2xl">
      <div className="flex flex-1 min-h-0 flex-col">
        <header className="border-b border-white/10 bg-gradient-to-br from-gray-900 via-gray-950 to-black px-6 py-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2">
              <DialogPrimitive.Title className="text-2xl font-semibold text-white">
                Mortgage Planner
              </DialogPrimitive.Title>
              <DialogPrimitive.Description className="text-sm text-gray-400">
                Model how your housing loan impacts cash, CPF, and MSR in three guided steps.
              </DialogPrimitive.Description>
              <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400">
                <span className="uppercase tracking-[0.18em] text-gray-500">
                  Currently modeling:
                </span>
                <Input
                  aria-label="Describe the home you are modeling"
                  autoComplete="off"
                  className="h-8 min-w-[220px] max-w-[280px] rounded-full border-white/20 bg-transparent px-3 text-[11px] font-semibold tracking-normal text-white placeholder:text-gray-500 focus:border-blue-400 focus-visible:ring-0"
                  onBlur={handleLocationBlur}
                  onChange={(event) =>
                    handleLocationChange(event.target.value ?? "")
                  }
                  placeholder="e.g. 4-room BTO in Tampines"
                  spellCheck={false}
                  value={locationDraft}
                />
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                className="border-white/30 text-gray-200"
                disabled
                title="Available after backend wiring"
                type="button"
                variant="outline"
              >
                <Lock className="h-4 w-4" />
                Save Draft
              </Button>
              <Button
                className="bg-blue-500 text-white hover:bg-blue-400"
                disabled
                title="Apply to plan once calculator APIs are live"
                type="button"
              >
                <Loader2 className="h-4 w-4" />
                Apply to Plan
              </Button>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-8 min-h-0">
          <MortgageWizard activeType={activeType} />
        </main>
      </div>
    </div>
  );
}
