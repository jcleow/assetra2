import type { FinancialPlanPayload } from "./plan-schema";

export function buildDefaultFinancialPlan(): FinancialPlanPayload {
  const timestamp = new Date().toISOString();
  return {
    assets: [
      {
        id: "mock-asset-1",
        name: "Investment Portfolio",
        category: "brokerage",
        currentValue: 75_000,
        annualGrowthRate: 0.07,
        notes: "401k rollover",
        updatedAt: timestamp,
      },
      {
        id: "mock-asset-2",
        name: "Emergency Fund",
        category: "cash",
        currentValue: 25_000,
        annualGrowthRate: 0.02,
        notes: "High-yield savings",
        updatedAt: timestamp,
      },
    ],
    liabilities: [
      {
        id: "mock-liability-1",
        name: "Mortgage",
        category: "mortgage",
        currentBalance: 350_000,
        interestRateApr: 0.035,
        minimumPayment: 2200,
        notes: "30-year fixed",
        updatedAt: timestamp,
      },
    ],
    incomes: [
      {
        id: "mock-income-1",
        source: "Software Engineering",
        amount: 8500,
        frequency: "monthly",
        startDate: timestamp,
        category: "employment",
        notes: "Full-time role",
        updatedAt: timestamp,
      },
    ],
    expenses: [
      {
        id: "mock-expense-1",
        payee: "Rent",
        amount: 2000,
        frequency: "monthly",
        category: "housing",
        notes: "City apartment",
        updatedAt: timestamp,
      },
      {
        id: "mock-expense-2",
        payee: "Groceries",
        amount: 600,
        frequency: "monthly",
        category: "food",
        notes: "Household essentials",
        updatedAt: timestamp,
      },
    ],
    cashflow: {
      summary: {
        monthlyIncome: 8500,
        monthlyExpenses: 2600,
        netMonthly: 5900,
      },
      breakdown: {},
    },
    summary: {
      totalAssets: 100_000,
      totalLiabilities: 350_000,
      netWorth: 250_000,
      monthlyIncome: 8500,
      monthlyExpenses: 2600,
      monthlySavings: 5900,
      savingsRate: 0.694117647,
    },
    lastUpdated: timestamp,
  };
}
