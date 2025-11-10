'use client';

import { useEffect } from 'react';
import {
  useFinancialPlan,
  useFinancialPlanningStore,
} from '@/features/financial-planning';
import { LifeEventTimelineChart } from './life-event-timeline-chart';

export function FinancialWorkspace() {
  const { data, isLoading, error } = useFinancialPlan();
  const setFinancialPlan = useFinancialPlanningStore((state) => state.setFinancialPlan);

  // Auto-load mock data on mount if no data exists
  useEffect(() => {
    const loadMockData = async () => {
      try {
        const response = await fetch('/api/financial-plan?mock=true');
        if (response.ok) {
          const mockData = await response.json();
          setFinancialPlan(mockData);
        }
      } catch (error) {
        console.error('Failed to load financial data:', error);
      }
    };

    if (!data && !isLoading) {
      loadMockData();
    }
  }, [data, isLoading, setFinancialPlan]);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
          <p className="text-sm text-gray-400">Loading financial data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center bg-gray-900">
        <div className="text-center max-w-sm">
          <div className="text-red-400 mb-2">
            <svg className="mx-auto h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.728-.833-2.498 0L3.316 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <p className="text-sm text-gray-400 mb-2">Unable to load financial data</p>
          <p className="text-xs text-gray-500">{error}</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex h-full items-center justify-center bg-gray-900">
        <div className="text-center">
          <div className="text-gray-500 mb-2">
            <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <p className="font-medium text-sm text-gray-300 mb-1">Financial Dashboard</p>
          <p className="text-xs text-gray-500">Loading your financial data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full bg-gray-900 text-white flex flex-col">
      {/* Main Chart Area */}
      <div className="flex-1 p-4 min-h-0">
        <LifeEventTimelineChart />
      </div>
    </div>
  );
}