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

// Type exports - TypeScript interfaces
export type { FinancialPlanPayload } from "@/app/api/financial-plan/route";
export {
  FinancialPlanProvider,
  useFinancialPlanContext,
} from "./components/FinancialPlanProvider";
export { FinancialSummary } from "./components/FinancialSummary";
// Component exports - UI components with loading/empty states
export { NetWorthGraph, NetWorthLineGraph } from "./components/NetWorthGraph";
export { ProjectionControls } from "./components/ProjectionControls";
// Persistence exports - Local storage helpers
export {
  createStorageSync,
  type PersistenceHelpers,
  persistenceHelpers,
  usePersistence,
} from "./persistence";
// Store exports - Core state management
export {
  type GraphDisplayOptions,
  type NetWorthTimelinePoint,
  type ProjectionSettings,
  useFinancialPlan,
  useFinancialPlanningStore,
  useNetWorthTimeline,
} from "./store";
// Utility exports - Formatters and calculations
export {
  type CurrencyFormatOptions,
  calculateCompoundGrowth,
  calculateFutureValue,
  calculateNetWorth,
  calculateSavingsRate,
  formatAge,
  formatConfirmationSummary,
  formatCurrency,
  formatPercentage,
  formatSummaryText,
  formatTimelineTooltip,
  formatYear,
  generateProjectionSummary,
  getNetWorthColor,
  getNetWorthStatus,
  validateProjectionSettings,
} from "./utils";
