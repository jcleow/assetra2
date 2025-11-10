import type { Asset, Liability, Income, Expense } from '@/lib/financial';

export interface FinancialPlan {
  assets: Asset[];
  liabilities: Liability[];
  incomes: Income[];
  expenses: Expense[];
  lastUpdated: string;
}

export interface NetWorthTimelinePoint {
  age: number;
  year: number;
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  monthlySavings: number;
}

export interface NetWorthTimeline {
  currentAge: number;
  retirementAge: number;
  dataPoints: NetWorthTimelinePoint[];
}

export interface TimelineProjection {
  projectionYears: number;
  inflationRate: number;
  averageReturnRate: number;
}

export interface FinancialSummary {
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  monthlySavings: number;
  savingsRate: number;
}

export interface GraphDisplayOptions {
  showAssets: boolean;
  showLiabilities: boolean;
  showNetWorth: boolean;
  showIncome: boolean;
  showExpenses: boolean;
  timeframe: 'next5years' | 'next10years' | 'untilRetirement' | 'custom';
  customYears?: number;
}