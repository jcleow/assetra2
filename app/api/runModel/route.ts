import { NextResponse } from "next/server";
import { z } from "zod";

import {
  computeNetWorth,
  type Asset,
  type Liability,
  type MonthlyCashFlow,
} from "@/lib/financial";

const projectionAssetSchema = z.object({
  id: z.string().min(1).optional(),
  name: z.string().optional(),
  category: z.string().optional(),
  currentValue: z.number(),
  annualGrowthRate: z.number().optional(),
  notes: z.string().nullable().optional(),
  updatedAt: z.string().optional(),
});

const projectionLiabilitySchema = z.object({
  id: z.string().min(1).optional(),
  name: z.string().optional(),
  category: z.string().optional(),
  currentBalance: z.number(),
  interestRateApr: z.number().optional(),
  minimumPayment: z.number().optional(),
  notes: z.string().nullable().optional(),
  updatedAt: z.string().optional(),
});

const runModelSchema = z.object({
  assets: z.array(projectionAssetSchema).default([]),
  liabilities: z.array(projectionLiabilitySchema).default([]),
  monthlyIncome: z.number().finite().default(0),
  monthlyExpenses: z.number().finite().default(0),
  currentAge: z.number().int().min(18).max(100),
  retirementAge: z.number().int().min(18).max(100).optional(),
  startYear: z.number().int().min(1900).max(2300).optional(),
});

type RunModelInput = z.infer<typeof runModelSchema>;

const buildMonthlyCashFlow = (
  income: number,
  expenses: number
): MonthlyCashFlow => ({
  monthlyIncome: income,
  monthlyExpenses: expenses,
  netMonthly: income - expenses,
});

const sanitizeAssets = (assets: RunModelInput["assets"]): Asset[] =>
  assets.map((asset, index) => ({
    ...asset,
    id: asset.id || `asset-${index}`,
    name: asset.name || `Asset ${index + 1}`,
    category: asset.category || "unspecified",
    annualGrowthRate:
      typeof asset.annualGrowthRate === "number" ? asset.annualGrowthRate : 0,
    notes: asset.notes ?? null,
    updatedAt: asset.updatedAt || new Date().toISOString(),
  }));

const sanitizeLiabilities = (
  liabilities: RunModelInput["liabilities"]
): Liability[] =>
  liabilities.map((liability, index) => ({
    ...liability,
    id: liability.id || `liability-${index}`,
    name: liability.name || `Liability ${index + 1}`,
    category: liability.category || "unspecified",
    interestRateApr:
      typeof liability.interestRateApr === "number"
        ? liability.interestRateApr
        : 0.03,
    minimumPayment:
      typeof liability.minimumPayment === "number"
        ? liability.minimumPayment
        : 0,
    notes: liability.notes ?? null,
    updatedAt: liability.updatedAt || new Date().toISOString(),
  }));

export async function POST(request: Request) {
  const startedAt = performance.now();
  try {
    const body = await request.json().catch(() => ({}));
    const payload = runModelSchema.parse(body);

    const monthlyCashFlow = buildMonthlyCashFlow(
      payload.monthlyIncome,
      payload.monthlyExpenses
    );

    const netWorthTimeline = computeNetWorth({
      assets: sanitizeAssets(payload.assets),
      liabilities: sanitizeLiabilities(payload.liabilities),
      monthlyCashFlow,
      currentAge: payload.currentAge,
      retirementAge: payload.retirementAge,
      startYear: payload.startYear,
    });

    const durationMs = Number((performance.now() - startedAt).toFixed(2));

    console.info("[runModel]", {
      durationMs,
      assets: payload.assets.length,
      liabilities: payload.liabilities.length,
    });

    return NextResponse.json({
      netWorthTimeline,
      meta: {
        durationMs,
        assetCount: payload.assets.length,
        liabilityCount: payload.liabilities.length,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Invalid projection payload",
          details: error.flatten(),
        },
        { status: 400 }
      );
    }

    console.error("[runModel] failure", error);
    return NextResponse.json(
      {
        error: "Failed to compute projections",
      },
      { status: 500 }
    );
  }
}
