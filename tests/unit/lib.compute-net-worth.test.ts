import { describe, expect, it } from "vitest";

import {
  computeNetWorth,
  demoFinancialData,
  demoMonthlyCashFlow,
  type NetWorthPoint,
} from "@/lib/financial";

const sumAssets = () =>
  demoFinancialData.assets.reduce(
    (total, asset) => total + asset.currentValue,
    0
  );

const sumLiabilities = () =>
  demoFinancialData.liabilities.reduce(
    (total, liability) => total + liability.currentBalance,
    0
  );

describe("computeNetWorth", () => {
  it("projects assets and liabilities through the retirement horizon", () => {
    const timeline = computeNetWorth({
      assets: demoFinancialData.assets,
      liabilities: demoFinancialData.liabilities,
      monthlyCashFlow: demoMonthlyCashFlow,
      currentAge: 35,
      retirementAge: 65,
      startYear: 2024,
    });

    expect(timeline.length).toBe(31);
    const first = timeline[0];
    const last = timeline.at(-1) as NetWorthPoint;

    expect(first.netWorth).toBeCloseTo(sumAssets() - sumLiabilities(), 0);
    expect(last.netWorth).toBeGreaterThan(first.netWorth);
    expect(last.liabilitiesTotal).toBeLessThan(first.liabilitiesTotal);
  });

  it("handles scenarios with no existing assets or liabilities", () => {
    const timeline = computeNetWorth({
      assets: [],
      liabilities: [],
      monthlyCashFlow: {
        monthlyIncome: 0,
        monthlyExpenses: 0,
        netMonthly: 0,
      },
      currentAge: 50,
      retirementAge: 52,
      startYear: 2024,
    });

    expect(timeline).toHaveLength(3);
    expect(timeline.every((point) => point.netWorth === 0)).toBe(true);
  });

  it("captures declining assets when monthly savings are negative", () => {
    const timeline = computeNetWorth({
      assets: demoFinancialData.assets,
      liabilities: [],
      monthlyCashFlow: {
        monthlyIncome: 3000,
        monthlyExpenses: 12000,
        netMonthly: -9000,
      },
      currentAge: 30,
      retirementAge: 35,
      startYear: 2024,
    });

    const first = timeline[0];
    const last = timeline.at(-1) as NetWorthPoint;

    expect(last.netWorth).toBeLessThan(first.netWorth);
  });

  it("accepts custom assumptions for inflation and growth", () => {
    const optimistic = computeNetWorth({
      assets: [],
      liabilities: [],
      monthlyCashFlow: {
        monthlyIncome: 8000,
        monthlyExpenses: 3000,
        netMonthly: 5000,
      },
      currentAge: 30,
      retirementAge: 35,
      assumptions: {
        defaultAssetGrowthRate: 0.08,
        inflationRate: 0.02,
      },
    });

    const pessimistic = computeNetWorth({
      assets: [],
      liabilities: [],
      monthlyCashFlow: {
        monthlyIncome: 8000,
        monthlyExpenses: 3000,
        netMonthly: 5000,
      },
      currentAge: 30,
      retirementAge: 35,
      assumptions: {
        defaultAssetGrowthRate: 0.02,
        inflationRate: 0.02,
      },
    });

    const optimisticFinal = optimistic.at(-1) as NetWorthPoint;
    const pessimisticFinal = pessimistic.at(-1) as NetWorthPoint;

    expect(optimisticFinal.netWorth).toBeGreaterThan(
      pessimisticFinal.netWorth
    );
  });
});
