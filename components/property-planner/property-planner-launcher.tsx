"use client";

import { Dialog as DialogPrimitive } from "radix-ui";
import { Building2, Sparkles, X } from "lucide-react";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  PropertyPlannerType,
  PROPERTY_TYPES,
} from "./mock-data";
import { PropertyPlannerShell } from "./property-planner-shell";
import { usePropertyPlannerStore } from "@/features/property-planner/store";
import { usePropertyPlannerModalStore } from "@/features/property-planner/modal-store";

export function PropertyPlannerLauncher() {
  const isOpen = usePropertyPlannerModalStore((state) => state.isOpen);
  const openModal = usePropertyPlannerModalStore((state) => state.open);
  const closeModal = usePropertyPlannerModalStore((state) => state.close);
  const activeType = usePropertyPlannerModalStore((state) => state.activeType);
  const setActiveType = usePropertyPlannerModalStore(
    (state) => state.setActiveType
  );
  const fetchScenarios = usePropertyPlannerStore((state) => state.fetch);

  useEffect(() => {
    void fetchScenarios();
  }, [fetchScenarios]);

  const activeLabel =
    PROPERTY_TYPES.find((type) => type.id === activeType)?.label ?? "HDB";

  return (
    <DialogPrimitive.Root
      open={isOpen}
      onOpenChange={(next) => (next ? openModal() : closeModal())}
    >
      <DialogPrimitive.Trigger asChild>
        <Button
          className="border border-white/10 bg-white/10 text-white hover:bg-white/20"
          type="button"
          variant="secondary"
        >
          <Sparkles className="h-4 w-4 text-blue-200" />
          Property Planner
          <span className="hidden text-xs text-gray-200 md:inline">
            ({activeLabel})
          </span>
        </Button>
      </DialogPrimitive.Trigger>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-black/75 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 focus:outline-none">
          <div className="relative h-full w-full max-h-[96vh] max-w-[1280px]">
            <PropertyPlannerShell activeType={activeType} />
            <DialogPrimitive.Close
              className="absolute right-6 top-6 inline-flex items-center justify-center rounded-full border border-white/10 bg-black/40 p-2 text-gray-300 transition hover:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              type="button"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Close property planner</span>
            </DialogPrimitive.Close>
            <div className="pointer-events-none absolute -top-6 left-6 hidden items-center gap-2 text-sm text-gray-400 md:flex">
              <Building2 className="h-4 w-4" />
              Property decision sandbox
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
