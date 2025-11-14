import { create } from "zustand";

import type { PropertyPlannerType } from "@/components/property-planner/mock-data";

interface ModalState {
  isOpen: boolean;
  activeType: PropertyPlannerType;
  open: () => void;
  close: () => void;
  setActiveType: (type: PropertyPlannerType) => void;
  openWithType: (type: PropertyPlannerType) => void;
}

export const usePropertyPlannerModalStore = create<ModalState>((set) => ({
  isOpen: false,
  activeType: "hdb",
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
  setActiveType: (type) => set({ activeType: type }),
  openWithType: (type) => set({ isOpen: true, activeType: type }),
}));
