import { type NextRequest, NextResponse } from "next/server";

import { FinancialClient } from "@/lib/financial/client";
import {
  financialPlanSchema,
  type FinancialPlanPayload,
} from "@/lib/financial/plan-schema";
import { buildDefaultFinancialPlan } from "@/lib/financial/default-plan";

// Create server-side client that calls Go service directly
const serverFinancialClient = new FinancialClient({
  baseUrl: process.env.GO_SERVICE_URL || "http://localhost:8080",
});

type CacheEntry = {
  data: FinancialPlanPayload;
  timestamp: number;
};

const cache = new Map<string, CacheEntry>();
const CACHE_TTL = 30 * 1000; // 30 seconds for development

function getCacheKey(request: NextRequest): string {
  const url = new URL(request.url);
  const mock = url.searchParams.get("mock");
  return `financial-plan:${mock || "live"}`;
}

function isExpired(entry: CacheEntry): boolean {
  return Date.now() - entry.timestamp > CACHE_TTL;
}

async function aggregateFinancialData(): Promise<FinancialPlanPayload> {
  try {
    const [assets, liabilities, incomes, expenses, cashflow] =
      await Promise.all([
        serverFinancialClient.assets.list(),
        serverFinancialClient.liabilities.list(),
        serverFinancialClient.incomes.list(),
        serverFinancialClient.expenses.list(),
        serverFinancialClient.cashflowSummary(),
      ]);

    const totalAssets = assets.reduce(
      (sum, asset) => sum + asset.currentValue,
      0
    );
    const totalLiabilities = liabilities.reduce(
      (sum, liability) => sum + liability.currentBalance,
      0
    );
    const netWorth = totalAssets - totalLiabilities;
    const monthlyIncome = cashflow.summary.monthlyIncome;
    const monthlyExpenses = cashflow.summary.monthlyExpenses;
    const monthlySavings = monthlyIncome - monthlyExpenses;
    const savingsRate = monthlyIncome > 0 ? monthlySavings / monthlyIncome : 0;

    const payload: FinancialPlanPayload = {
      assets,
      liabilities,
      incomes,
      expenses,
      cashflow,
      summary: {
        totalAssets,
        totalLiabilities,
        netWorth,
        monthlyIncome,
        monthlyExpenses,
        monthlySavings,
        savingsRate,
      },
      lastUpdated: new Date().toISOString(),
    };

    return financialPlanSchema.parse(payload);
  } catch (error) {
    console.error("Failed to aggregate financial data:", error);
    throw new Error("Failed to aggregate financial data from Go service");
  }
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const mockMode = url.searchParams.get("mock") === "true";
    const forceRefresh = url.searchParams.get("refresh") === "true";

    const cacheKey = getCacheKey(request);
    const cachedEntry = cache.get(cacheKey);

    if (!forceRefresh && cachedEntry && !isExpired(cachedEntry)) {
      return NextResponse.json(cachedEntry.data, {
        headers: {
          "Cache-Control": "public, max-age=300",
          "X-Cache-Status": "HIT",
        },
      });
    }

    const data = mockMode
      ? financialPlanSchema.parse(buildDefaultFinancialPlan())
      : await aggregateFinancialData();

    cache.set(cacheKey, {
      data,
      timestamp: Date.now(),
    });

    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "public, max-age=300",
        "X-Cache-Status": "MISS",
        "X-Data-Source": mockMode ? "MOCK" : "LIVE",
      },
    });
  } catch (error) {
    console.error("Financial plan API error:", error);

    if (error instanceof Error && error.message.includes("Go service")) {
      return NextResponse.json(
        {
          error: "Financial service unavailable",
          message:
            "The Go financial service is currently unavailable. Try using mock mode by adding ?mock=true to your request.",
          remediation:
            "Ensure the Go service is running or use mock data for development.",
        },
        {
          status: 503,
          headers: {
            "Retry-After": "60",
          },
        }
      );
    }

    return NextResponse.json(
      {
        error: "Internal server error",
        message: "Failed to process financial plan request",
        remediation:
          "Please try again later or contact support if the issue persists.",
      },
      { status: 500 }
    );
  }
}

export function POST(request: NextRequest) {
  try {
    const cacheKey = getCacheKey(request);
    cache.delete(cacheKey);

    return NextResponse.json(
      {
        message: "Financial plan cache invalidated. Fresh data will be loaded on next request.",
      },
      {
        status: 202,
        headers: {
          "X-Cache-Action": "INVALIDATED",
        },
      }
    );
  } catch (error) {
    console.error("Failed to invalidate cache:", error);
    return NextResponse.json(
      {
        error: "Failed to invalidate financial plan cache",
      },
      { status: 500 }
    );
  }
}

