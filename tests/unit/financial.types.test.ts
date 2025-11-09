import { describe, expect, expectTypeOf, it } from "vitest";

import {
  assetSchema,
  computeMonthlyCashFlow,
  demoFinancialData,
  expenseSchema,
  incomeSchema,
  type Asset,
  type AssetCreatePayload,
  type Expense,
  type ExpenseCreatePayload,
  type Income,
  type IncomeCreatePayload,
} from "@/lib/financial";

describe("financial schemas", () => {
  it("parses valid asset payloads", () => {
    const asset = demoFinancialData.assets[0];
    expect(() => assetSchema.parse(asset)).not.toThrow();
  });

  it("rejects invalid assets missing required fields", () => {
    const invalid = {
      ...demoFinancialData.assets[0],
      name: "",
    };
    expect(() => assetSchema.parse(invalid)).toThrow(/String must contain at least/);
  });

  it("rejects invalid incomes with non-positive amounts", () => {
    const invalidIncome: Income = {
      ...demoFinancialData.incomes[0],
      amount: 0,
    };
    expect(() => incomeSchema.parse(invalidIncome)).toThrow(/Number must be greater than 0/);
  });

  it("rejects invalid expenses with unsupported frequency", () => {
    const invalidExpense: Expense = {
      ...demoFinancialData.expenses[0],
      frequency: "weekly-ish" as Expense["frequency"],
    };
    expect(() => expenseSchema.parse(invalidExpense)).toThrow(/Invalid enum value/);
  });

  it("computes monthly cash-flow aggregates with rounding", () => {
    const summary = computeMonthlyCashFlow(
      [
        {
          ...demoFinancialData.incomes[0],
          amount: 1200,
          frequency: "yearly",
        },
        {
          ...demoFinancialData.incomes[1],
          amount: 100,
          frequency: "weekly",
        },
      ],
      [
        {
          ...demoFinancialData.expenses[0],
          amount: 50,
          frequency: "biweekly",
        },
      ],
    );

    expect(summary).toEqual({
      monthlyIncome: 533.33,
      monthlyExpenses: 108.33,
      netMonthly: 425.0,
    });
  });
});

describe("financial type contracts", () => {
  it("keeps notes nullable/optional on assets", () => {
    expectTypeOf<Asset>().toHaveProperty("notes").toEqualTypeOf<string | null | undefined>();
  });

  it("requires AssetCreatePayload id to be optional but Asset retains required id", () => {
    expectTypeOf<Asset>().toHaveProperty("id").toEqualTypeOf<string>();
    expectTypeOf<AssetCreatePayload>().toHaveProperty("id").toEqualTypeOf<string | undefined>();
  });

  it("ensures income and expense create payloads require frequency and amount", () => {
    expectTypeOf<IncomeCreatePayload>().toHaveProperty("frequency").toEqualTypeOf<Income["frequency"]>();
    expectTypeOf<IncomeCreatePayload>().toHaveProperty("amount").toEqualTypeOf<number>();

    expectTypeOf<ExpenseCreatePayload>().toHaveProperty("frequency").toEqualTypeOf<Expense["frequency"]>();
    expectTypeOf<ExpenseCreatePayload>().toHaveProperty("amount").toEqualTypeOf<number>();
  });
});
