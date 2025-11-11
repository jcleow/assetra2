"use client";

import React, {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
} from "react";
import { useFinancialPlanningStore } from "../store";

interface FinancialPlanContextValue {
  isInitialized: boolean;
  autoRefresh: boolean;
  setAutoRefresh: (enabled: boolean) => void;
}

const FinancialPlanContext = createContext<FinancialPlanContextValue | null>(
  null
);

interface FinancialPlanProviderProps {
  children: ReactNode;
  autoLoadData?: boolean;
  refreshInterval?: number;
}

export function FinancialPlanProvider({
  children,
  autoLoadData = false,
  refreshInterval = 5 * 60 * 1000, // 5 minutes
}: FinancialPlanProviderProps) {
  const [isInitialized, setIsInitialized] = React.useState(false);
  const [autoRefresh, setAutoRefresh] = React.useState(false);
  const refreshData = useFinancialPlanningStore((state) => state.refreshData);
  const financialPlan = useFinancialPlanningStore(
    (state) => state.financialPlan
  );

  useEffect(() => {
    if (autoLoadData && !financialPlan) {
      refreshData().finally(() => setIsInitialized(true));
    } else {
      setIsInitialized(true);
    }
  }, [autoLoadData, financialPlan, refreshData]);

  useEffect(() => {
    if (!autoRefresh || refreshInterval <= 0) return;

    const interval = setInterval(() => {
      refreshData();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, refreshData]);

  const contextValue: FinancialPlanContextValue = {
    isInitialized,
    autoRefresh,
    setAutoRefresh,
  };

  return (
    <FinancialPlanContext.Provider value={contextValue}>
      {children}
    </FinancialPlanContext.Provider>
  );
}

export function useFinancialPlanContext(): FinancialPlanContextValue {
  const context = useContext(FinancialPlanContext);
  if (!context) {
    throw new Error(
      "useFinancialPlanContext must be used within a FinancialPlanProvider"
    );
  }
  return context;
}
