import { z } from "zod";

export const frequencyEnum = z.enum([
  "weekly",
  "biweekly",
  "monthly",
  "quarterly",
  "yearly",
]);

export type Frequency = z.infer<typeof frequencyEnum>;

const isoDateTime = z
  .string()
  .refine(
    (value) => !Number.isNaN(Date.parse(value)),
    "Expected an ISO-8601 timestamp",
  );

const optionalNotes = z.string().trim().optional().nullable();

export const assetSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  category: z.string().min(1),
  currentValue: z.number(),
  annualGrowthRate: z.number(),
  notes: optionalNotes,
  updatedAt: isoDateTime,
});

export type Asset = z.infer<typeof assetSchema>;

export const liabilitySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  category: z.string().min(1),
  currentBalance: z.number(),
  interestRateApr: z.number(),
  minimumPayment: z.number(),
  notes: optionalNotes,
  updatedAt: isoDateTime,
});

export type Liability = z.infer<typeof liabilitySchema>;

export const incomeSchema = z.object({
  id: z.string().min(1),
  source: z.string().min(1),
  amount: z.number().positive(),
  frequency: frequencyEnum,
  startDate: isoDateTime,
  category: z.string().min(1),
  notes: optionalNotes,
  updatedAt: isoDateTime,
});

export type Income = z.infer<typeof incomeSchema>;

export const expenseSchema = z.object({
  id: z.string().min(1),
  payee: z.string().min(1),
  amount: z.number().positive(),
  frequency: frequencyEnum,
  category: z.string().min(1),
  notes: optionalNotes,
  updatedAt: isoDateTime,
});

export type Expense = z.infer<typeof expenseSchema>;

export const monthlyCashFlowSchema = z.object({
  monthlyIncome: z.number(),
  monthlyExpenses: z.number(),
  netMonthly: z.number(),
});

export type MonthlyCashFlow = z.infer<typeof monthlyCashFlowSchema>;

export const netWorthPointSchema = z.object({
  date: isoDateTime,
  assetsTotal: z.number(),
  liabilitiesTotal: z.number(),
  netWorth: z.number(),
});

export type NetWorthPoint = z.infer<typeof netWorthPointSchema>;

const MONTHLY_FACTORS: Record<Frequency, number> = {
  weekly: 52 / 12,
  biweekly: 26 / 12,
  monthly: 1,
  quarterly: 1 / 3,
  yearly: 1 / 12,
};

const roundToCents = (value: number) => Math.round(value * 100) / 100;

const toMonthlyAmount = (amount: number, frequency: Frequency) =>
  roundToCents(amount * MONTHLY_FACTORS[frequency]);

export function computeMonthlyCashFlow(
  incomes: Income[],
  expenses: Expense[],
): MonthlyCashFlow {
  const monthlyIncome = roundToCents(
    incomes.reduce(
      (total, income) => total + toMonthlyAmount(income.amount, income.frequency),
      0,
    ),
  );

  const monthlyExpenses = roundToCents(
    expenses.reduce(
      (total, expense) =>
        total + toMonthlyAmount(expense.amount, expense.frequency),
      0,
    ),
  );

  return {
    monthlyIncome,
    monthlyExpenses,
    netMonthly: roundToCents(monthlyIncome - monthlyExpenses),
  };
}

export type AssetCreatePayload = Omit<Asset, "id" | "updatedAt"> & {
  id?: string;
};
export type AssetUpdatePayload = Omit<Asset, "updatedAt">;

export type LiabilityCreatePayload = Omit<Liability, "id" | "updatedAt"> & {
  id?: string;
};
export type LiabilityUpdatePayload = Omit<Liability, "updatedAt">;

export type IncomeCreatePayload = Omit<Income, "id" | "updatedAt"> & {
  id?: string;
};
export type IncomeUpdatePayload = Omit<Income, "updatedAt">;

export type ExpenseCreatePayload = Omit<Expense, "id" | "updatedAt"> & {
  id?: string;
};
export type ExpenseUpdatePayload = Omit<Expense, "updatedAt">;
