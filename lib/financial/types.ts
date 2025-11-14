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
    "Expected an ISO-8601 timestamp"
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

export const mortgageInputsSchema = z.object({
  loanAmount: z.number(),
  loanTermYears: z.number(),
  borrowerType: z.string().min(1),
  loanStartMonth: z.string().min(1),
  fixedYears: z.number(),
  fixedRate: z.number(),
  floatingRate: z.number(),
  householdIncome: z.number(),
  otherDebt: z.number(),
});

export const mortgageBalancePointSchema = z.object({
  label: z.string().min(1),
  balance: z.number(),
  year: z.number().int(),
  yearIndex: z.number().int(),
});

export const mortgageCompositionPointSchema = z.object({
  label: z.string().min(1),
  interest: z.number(),
  principal: z.number(),
  year: z.number().int(),
  yearIndex: z.number().int(),
});

export const mortgageAmortizationSchema = z.object({
  balancePoints: z.array(mortgageBalancePointSchema),
  composition: z.array(mortgageCompositionPointSchema),
});

export const mortgageSnapshotSchema = z.object({
  monthlyPayment: z.number(),
  totalInterest: z.number(),
  loanEndDate: z.string().min(1),
  msrRatio: z.number(),
});

export const propertyPlannerSummarySchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  value: z.number(),
  helper: z.string(),
  emphasis: z.string().optional().nullable(),
});

export const propertyPlannerTimelinePointSchema = z.object({
  id: z.string().min(1),
  year: z.number().int(),
  label: z.string().min(1),
  cashOutlay: z.number(),
  cpfUsage: z.number(),
  loanBalance: z.number(),
  valuation: z.number(),
});

export const propertyPlannerMilestoneSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1),
  timeframe: z.string().min(1),
  tone: z.string().optional().nullable(),
});

export const propertyPlannerInsightSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  detail: z.string().min(1),
  tone: z.string().min(1),
});

export const propertyPlannerScenarioSchema = z.object({
  id: z.string(),
  type: z.string().min(1),
  headline: z.string().min(1),
  subheadline: z.string().optional().default(""),
  lastRefreshed: z.string().optional().default(""),
  inputs: mortgageInputsSchema,
  amortization: mortgageAmortizationSchema,
  snapshot: mortgageSnapshotSchema,
  summary: z.array(propertyPlannerSummarySchema),
  timeline: z.array(propertyPlannerTimelinePointSchema),
  milestones: z.array(propertyPlannerMilestoneSchema),
  insights: z.array(propertyPlannerInsightSchema),
  updatedAt: isoDateTime,
});

export type PropertyPlannerScenario = z.infer<
  typeof propertyPlannerScenarioSchema
>;

export type MortgageInputs = z.infer<typeof mortgageInputsSchema>;
export type MortgageBalancePoint = z.infer<
  typeof mortgageBalancePointSchema
>;
export type MortgageCompositionPoint = z.infer<
  typeof mortgageCompositionPointSchema
>;
export type MortgageAmortization = z.infer<typeof mortgageAmortizationSchema>;
export type MortgageSnapshot = z.infer<typeof mortgageSnapshotSchema>;
export type PropertyPlannerSummary = z.infer<
  typeof propertyPlannerSummarySchema
>;
export type PropertyPlannerTimelinePoint = z.infer<
  typeof propertyPlannerTimelinePointSchema
>;
export type PropertyPlannerMilestone = z.infer<
  typeof propertyPlannerMilestoneSchema
>;
export type PropertyPlannerInsight = z.infer<
  typeof propertyPlannerInsightSchema
>;

export const monthlyCashFlowSchema = z.object({
  monthlyIncome: z.number(),
  monthlyExpenses: z.number(),
  netMonthly: z.number(),
});

export type MonthlyCashFlow = z.infer<typeof monthlyCashFlowSchema>;

export const cashFlowSnapshotSchema = z.object({
  incomes: z.array(incomeSchema),
  expenses: z.array(expenseSchema),
  summary: monthlyCashFlowSchema,
});

export type CashFlowSnapshot = z.infer<typeof cashFlowSnapshotSchema>;

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
  expenses: Expense[]
): MonthlyCashFlow {
  const monthlyIncome = roundToCents(
    incomes.reduce(
      (total, income) =>
        total + toMonthlyAmount(income.amount, income.frequency),
      0
    )
  );

  const monthlyExpenses = roundToCents(
    expenses.reduce(
      (total, expense) =>
        total + toMonthlyAmount(expense.amount, expense.frequency),
      0
    )
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

export type PropertyPlannerScenarioCreatePayload = Omit<
  PropertyPlannerScenario,
  "id" | "updatedAt"
> & { id?: string };
export type PropertyPlannerScenarioUpdatePayload = Omit<
  PropertyPlannerScenario,
  "updatedAt"
>;
