"use client";

import { Dialog as DialogPrimitive } from "radix-ui";
import { Loader2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  PROPERTY_PLANNER_MOCKS,
  PROPERTY_TYPES,
  PropertyPlannerType,
} from "./mock-data";
import { MortgageWizard } from "./mortgage-wizard";

interface PropertyPlannerShellProps {
  activeType: PropertyPlannerType;
  onTypeChange: (type: PropertyPlannerType) => void;
}

export function PropertyPlannerShell({
  activeType,
  onTypeChange,
}: PropertyPlannerShellProps) {
  const scenario = PROPERTY_PLANNER_MOCKS[activeType];

  const navItems = PROPERTY_TYPES;

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
              <p className="text-xs uppercase tracking-[0.18em] text-gray-500">
                Currently modeling: {scenario.headline}
              </p>
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
          <MortgageWizard />
        </main>
      </div>
    </div>
  );
}
