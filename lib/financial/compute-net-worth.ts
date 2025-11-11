import defaultProjectionAssumptions from "./projection-assumptions.json" with {
  type: "json",
};
import type { Asset, Liability, MonthlyCashFlow, NetWorthPoint } from "./types";

export interface ProjectionAssumptions {
  defaultRetirementAge: number;
  maxProjectionYears: number;
  inflationRate: number;
  defaultAssetGrowthRate: number;
  cashYieldRate: number;
  liabilityInterestFloor: number;
}

export interface ComputeNetWorthParams {
  assets: Asset[];
  liabilities: Liability[];
  monthlyCashFlow: MonthlyCashFlow;
  currentAge: number;
  retirementAge?: number;
  startYear?: number;
  assumptions?: Partial<ProjectionAssumptions>;
}

type AssetBucket = {
  id: string;
  value: number;
  rate: number;
};

type LiabilityBucket = {
  id: string;
  balance: number;
  rate: number;
  minimumPayment: number;
};

const currencyRound = (value: number) =>
  Math.round((Number.isFinite(value) ? value : 0) * 100) / 100;

const mergeAssumptions = (
  overrides: Partial<ProjectionAssumptions> | undefined
): ProjectionAssumptions => ({
  ...defaultProjectionAssumptions,
  ...overrides,
});

const buildAssetBuckets = (
  assets: Asset[],
  assumptions: ProjectionAssumptions
): AssetBucket[] => {
  if (assets.length === 0) {
    return [
      {
        id: "synthetic-asset",
        value: 0,
        rate: assumptions.defaultAssetGrowthRate,
      },
    ];
  }

  return assets.map((asset) => ({
    id: asset.id,
    value: currencyRound(asset.currentValue),
    rate:
      Number.isFinite(asset.annualGrowthRate) && asset.annualGrowthRate >= 0
        ? asset.annualGrowthRate
        : assumptions.defaultAssetGrowthRate,
  }));
};

const buildLiabilityBuckets = (
  liabilities: Liability[],
  assumptions: ProjectionAssumptions
): LiabilityBucket[] =>
  liabilities.map((liability) => ({
    id: liability.id,
    balance: currencyRound(liability.currentBalance),
    rate:
      Number.isFinite(liability.interestRateApr) &&
      liability.interestRateApr >= 0
        ? liability.interestRateApr
        : assumptions.liabilityInterestFloor,
    minimumPayment: Math.max(liability.minimumPayment, 0),
  }));

const distributeContribution = (buckets: AssetBucket[], amount: number) => {
  if (amount === 0 || buckets.length === 0) {
    return;
  }

  if (amount > 0) {
    const positiveBuckets = buckets.filter((bucket) => bucket.value > 0);
    if (positiveBuckets.length === 0) {
      buckets[0].value = currencyRound(buckets[0].value + amount);
      return;
    }
    const total = positiveBuckets.reduce(
      (sum, bucket) => sum + bucket.value,
      0
    );
    positiveBuckets.forEach((bucket) => {
      const weight = bucket.value / total;
      bucket.value = currencyRound(bucket.value + amount * weight);
    });
    return;
  }

  let remaining = Math.abs(amount);
  const sorted = [...buckets].sort((a, b) => b.value - a.value);
  for (const bucket of sorted) {
    if (remaining <= 0) break;
    const deduction = Math.min(bucket.value, remaining);
    bucket.value = currencyRound(bucket.value - deduction);
    remaining -= deduction;
  }
  if (remaining > 0) {
    buckets[0].value = currencyRound(buckets[0].value - remaining);
  }
};

const applyAssetGrowth = (bucket: AssetBucket) => {
  bucket.value = currencyRound(bucket.value * (1 + bucket.rate));
};

const applyLiabilityAmortization = (
  bucket: LiabilityBucket,
  assumptions: ProjectionAssumptions
) => {
  if (bucket.balance <= 0) {
    bucket.balance = 0;
    return;
  }

  const apr = bucket.rate ?? assumptions.liabilityInterestFloor;
  const interest = bucket.balance * apr;
  const payment = bucket.minimumPayment * 12;
  const nextBalance = bucket.balance + interest - payment;
  bucket.balance = nextBalance > 0 ? currencyRound(nextBalance) : 0;
};

export function computeNetWorth({
  assets,
  liabilities,
  monthlyCashFlow,
  currentAge,
  retirementAge,
  startYear,
  assumptions: overrides,
}: ComputeNetWorthParams): NetWorthPoint[] {
  const assumptions = mergeAssumptions(overrides);
  const resolvedRetirementAge =
    retirementAge ?? assumptions.defaultRetirementAge;
  const projectionYears = Math.min(
    assumptions.maxProjectionYears,
    Math.max(1, resolvedRetirementAge - currentAge)
  );
  const firstYear = startYear ?? new Date().getUTCFullYear();

  const assetBuckets = buildAssetBuckets(assets, assumptions);
  const liabilityBuckets = buildLiabilityBuckets(liabilities, assumptions);

  let monthlyIncome = currencyRound(monthlyCashFlow.monthlyIncome);
  let monthlyExpenses = currencyRound(monthlyCashFlow.monthlyExpenses);
  let monthlySavings = currencyRound(monthlyCashFlow.netMonthly);

  const timeline: NetWorthPoint[] = [];

  for (let year = 0; year <= projectionYears; year += 1) {
    const assetsTotal = currencyRound(
      assetBuckets.reduce((sum, bucket) => sum + bucket.value, 0)
    );
    const liabilitiesTotal = currencyRound(
      liabilityBuckets.reduce((sum, bucket) => sum + bucket.balance, 0)
    );
    const netWorth = currencyRound(assetsTotal - liabilitiesTotal);

    const date = new Date(Date.UTC(firstYear + year, 0, 1)).toISOString();
    timeline.push({
      date,
      assetsTotal,
      liabilitiesTotal,
      netWorth,
    });

    if (year === projectionYears) {
      break;
    }

    const yearlySavings = currencyRound(monthlySavings * 12);
    distributeContribution(assetBuckets, yearlySavings);
    assetBuckets.forEach(applyAssetGrowth);
    assetBuckets.forEach((bucket) => {
      if (bucket.id === "synthetic-asset") {
        bucket.rate = assumptions.defaultAssetGrowthRate;
      }
    });

    liabilityBuckets.forEach((bucket) =>
      applyLiabilityAmortization(bucket, assumptions)
    );

    monthlyIncome = currencyRound(
      monthlyIncome * (1 + assumptions.inflationRate)
    );
    monthlyExpenses = currencyRound(
      monthlyExpenses * (1 + assumptions.inflationRate)
    );
    monthlySavings = currencyRound(monthlyIncome - monthlyExpenses);
  }

  return timeline;
}
