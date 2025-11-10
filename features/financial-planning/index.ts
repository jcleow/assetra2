/**
 * Financial Planning Module
 *
 * A comprehensive module for managing financial planning state, visualization,
 * and data persistence. Designed for tree-shaking and modular consumption.
 *
 * @example
 * ```tsx
 * import { useFinancialPlan, NetWorthGraph, formatCurrency } from '@/features/financial-planning';
 *
 * function FinancialDashboard() {
 *   const { data, isLoading } = useFinancialPlan();
 *
 *   if (isLoading) return <div>Loading...</div>;
 *
 *   return (
 *     <div>
 *       <h1>Net Worth: {formatCurrency(data?.summary.netWorth || 0)}</h1>
 *       <NetWorthGraph height={400} />
 *     </div>
 *   );
 * }
 * ```
 */

// Store exports - Core state management
export {
  useFinancialPlanningStore,
  useFinancialPlan,
  useNetWorthTimeline,
  type NetWorthTimelinePoint,
  type ProjectionSettings,
  type GraphDisplayOptions,
} from './store';

// Component exports - UI components with loading/empty states
export { NetWorthGraph, NetWorthLineGraph } from './components/NetWorthGraph';
export { FinancialSummary } from './components/FinancialSummary';
export { ProjectionControls } from './components/ProjectionControls';
export { FinancialPlanProvider, useFinancialPlanContext } from './components/FinancialPlanProvider';

// Utility exports - Formatters and calculations
export {
  formatCurrency,
  formatPercentage,
  formatAge,
  formatYear,
  calculateNetWorth,
  calculateSavingsRate,
  formatSummaryText,
  generateProjectionSummary,
  formatTimelineTooltip,
  validateProjectionSettings,
  calculateCompoundGrowth,
  calculateFutureValue,
  getNetWorthColor,
  getNetWorthStatus,
  formatConfirmationSummary,
  type CurrencyFormatOptions,
} from './utils';

// Persistence exports - Local storage helpers
export {
  persistenceHelpers,
  usePersistence,
  createStorageSync,
  type PersistenceHelpers,
} from './persistence';

// Type exports - TypeScript interfaces
export type { FinancialPlanPayload } from '@/app/api/financial-plan/route';