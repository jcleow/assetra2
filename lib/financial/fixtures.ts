import type { Asset, Expense, Income, Liability, NetWorthPoint } from "./types";
import { computeMonthlyCashFlow } from "./types";

const UPDATED_AT = "2024-01-01T00:00:00.000Z";

const baseAssets: Asset[] = [
  {
    id: "asset-brokerage",
    name: "Total Market Index",
    category: "brokerage",
    currentValue: 185_000,
    annualGrowthRate: 0.06,
    notes: null,
    updatedAt: UPDATED_AT,
  },
  {
    id: "asset-cash",
    name: "High-Yield Savings",
    category: "cash",
    currentValue: 24_500,
    annualGrowthRate: 0.018,
    notes: "Emergency fund",
    updatedAt: UPDATED_AT,
  },
  {
    id: "asset-retirement",
    name: "401k - Employer Match",
    category: "retirement",
    currentValue: 320_000,
    annualGrowthRate: 0.07,
    notes: null,
    updatedAt: UPDATED_AT,
  },
];

const baseLiabilities: Liability[] = [
  {
    id: "liability-mortgage",
    name: "Primary Mortgage",
    category: "mortgage",
    currentBalance: 412_750,
    interestRateApr: 0.0475,
    minimumPayment: 2580,
    notes: null,
    updatedAt: UPDATED_AT,
  },
  {
    id: "liability-auto",
    name: "EV Loan",
    category: "auto",
    currentBalance: 18_900,
    interestRateApr: 0.0325,
    minimumPayment: 405,
    notes: null,
    updatedAt: UPDATED_AT,
  },
  {
    id: "liability-card",
    name: "Rewards Card",
    category: "credit_card",
    currentBalance: 3200,
    interestRateApr: 0.199,
    minimumPayment: 115,
    notes: "Paid off monthly",
    updatedAt: UPDATED_AT,
  },
];

const baseIncomes: Income[] = [
  {
    id: "income-salary",
    source: "Product Manager Salary",
    category: "salary",
    amount: 9800,
    frequency: "monthly",
    startDate: "2021-06-01T00:00:00.000Z",
    notes: null,
    updatedAt: UPDATED_AT,
  },
  {
    id: "income-partner",
    source: "Partner Salary",
    category: "salary",
    amount: 8250,
    frequency: "monthly",
    startDate: "2022-02-01T00:00:00.000Z",
    notes: null,
    updatedAt: UPDATED_AT,
  },
  {
    id: "income-bonus",
    source: "Annual Bonus",
    category: "bonus",
    amount: 18_500,
    frequency: "yearly",
    startDate: "2019-01-01T00:00:00.000Z",
    notes: "Varies by performance",
    updatedAt: UPDATED_AT,
  },
  {
    id: "income-side",
    source: "Freelance Design",
    category: "side_hustle",
    amount: 600,
    frequency: "biweekly",
    startDate: "2023-05-01T00:00:00.000Z",
    notes: null,
    updatedAt: UPDATED_AT,
  },
];

const baseExpenses: Expense[] = [
  {
    id: "expense-housing",
    payee: "Mortgage",
    category: "housing",
    amount: 2580,
    frequency: "monthly",
    notes: null,
    updatedAt: UPDATED_AT,
  },
  {
    id: "expense-childcare",
    payee: "Childcare",
    category: "family",
    amount: 1250,
    frequency: "monthly",
    notes: null,
    updatedAt: UPDATED_AT,
  },
  {
    id: "expense-groceries",
    payee: "Groceries",
    category: "living",
    amount: 900,
    frequency: "monthly",
    notes: null,
    updatedAt: UPDATED_AT,
  },
  {
    id: "expense-travel",
    payee: "Travel Fund",
    category: "discretionary",
    amount: 500,
    frequency: "monthly",
    notes: null,
    updatedAt: UPDATED_AT,
  },
  {
    id: "expense-dining",
    payee: "Dining Out",
    category: "discretionary",
    amount: 220,
    frequency: "weekly",
    notes: null,
    updatedAt: UPDATED_AT,
  },
];

const baseNetWorthTimeline: NetWorthPoint[] = [
  {
    date: "2024-01-01T00:00:00.000Z",
    assetsTotal: 529_500,
    liabilitiesTotal: 434_850,
    netWorth: 94_650,
  },
  {
    date: "2025-01-01T00:00:00.000Z",
    assetsTotal: 571_235,
    liabilitiesTotal: 410_100,
    netWorth: 161_135,
  },
  {
    date: "2026-01-01T00:00:00.000Z",
    assetsTotal: 615_420,
    liabilitiesTotal: 384_250,
    netWorth: 231_170,
  },
  {
    date: "2027-01-01T00:00:00.000Z",
    assetsTotal: 662_250,
    liabilitiesTotal: 358_400,
    netWorth: 303_850,
  },
];

export interface DemoFinancialData {
  assets: Asset[];
  liabilities: Liability[];
  incomes: Income[];
  expenses: Expense[];
  netWorthTimeline: NetWorthPoint[];
}

export const demoFinancialData: DemoFinancialData = Object.freeze({
  assets: baseAssets,
  liabilities: baseLiabilities,
  incomes: baseIncomes,
  expenses: baseExpenses,
  netWorthTimeline: baseNetWorthTimeline,
});

export const demoMonthlyCashFlow = computeMonthlyCashFlow(
  baseIncomes,
  baseExpenses
);

export const cloneDemoFinancialData = (): DemoFinancialData => ({
  assets: structuredClone(baseAssets),
  liabilities: structuredClone(baseLiabilities),
  incomes: structuredClone(baseIncomes),
  expenses: structuredClone(baseExpenses),
  netWorthTimeline: structuredClone(baseNetWorthTimeline),
});
