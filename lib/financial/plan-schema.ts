import { z } from "zod";

export const financialPlanSchema = z.object({
  assets: z.array(z.any()),
  liabilities: z.array(z.any()),
  incomes: z.array(z.any()),
  expenses: z.array(z.any()),
  cashflow: z.object({
    summary: z.object({
      monthlyIncome: z.number(),
      monthlyExpenses: z.number(),
      netMonthly: z.number(),
    }),
    breakdown: z.any(),
  }),
  summary: z.object({
    totalAssets: z.number(),
    totalLiabilities: z.number(),
    netWorth: z.number(),
    monthlyIncome: z.number(),
    monthlyExpenses: z.number(),
    monthlySavings: z.number(),
    savingsRate: z.number(),
  }),
  lastUpdated: z.string(),
});

export type FinancialPlanPayload = z.infer<typeof financialPlanSchema>;
