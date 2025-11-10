import { NextRequest, NextResponse } from 'next/server';
import { FinancialClient } from '@/lib/financial/client';
import { z } from 'zod';

// Create server-side client that calls Go service directly
const serverFinancialClient = new FinancialClient({
  baseUrl: process.env.GO_SERVICE_URL || 'http://localhost:8080',
});

const financialPlanSchema = z.object({
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

const MOCK_DATA: FinancialPlanPayload = {
  assets: [
    {
      id: 'mock-asset-1',
      name: 'Investment Portfolio',
      category: 'brokerage',
      currentValue: 75000,
      annualGrowthRate: 0.07,
      notes: '401k rollover',
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'mock-asset-2',
      name: 'Emergency Fund',
      category: 'cash',
      currentValue: 25000,
      annualGrowthRate: 0.02,
      notes: 'High-yield savings',
      updatedAt: new Date().toISOString(),
    },
  ],
  liabilities: [
    {
      id: 'mock-liability-1',
      name: 'Mortgage',
      category: 'mortgage',
      currentBalance: 350000,
      interestRateApr: 0.035,
      minimumPayment: 2200,
      notes: '30-year fixed',
      updatedAt: new Date().toISOString(),
    },
  ],
  incomes: [
    {
      id: 'mock-income-1',
      source: 'Software Engineering',
      amount: 8500,
      frequency: 'monthly',
      startDate: new Date().toISOString(),
      category: 'employment',
      updatedAt: new Date().toISOString(),
    },
  ],
  expenses: [
    {
      id: 'mock-expense-1',
      payee: 'Rent',
      amount: 2000,
      frequency: 'monthly',
      category: 'housing',
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'mock-expense-2',
      payee: 'Groceries',
      amount: 600,
      frequency: 'monthly',
      category: 'food',
      updatedAt: new Date().toISOString(),
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
    totalAssets: 100000,
    totalLiabilities: 350000,
    netWorth: 250000,
    monthlyIncome: 8500,
    monthlyExpenses: 2600,
    monthlySavings: 5900,
    savingsRate: 0.694,
  },
  lastUpdated: new Date().toISOString(),
};

interface CacheEntry {
  data: FinancialPlanPayload;
  timestamp: number;
}

const cache = new Map<string, CacheEntry>();
const CACHE_TTL = 30 * 1000; // 30 seconds for development

function getCacheKey(request: NextRequest): string {
  const url = new URL(request.url);
  const mock = url.searchParams.get('mock');
  return `financial-plan:${mock || 'live'}`;
}

function isExpired(entry: CacheEntry): boolean {
  return Date.now() - entry.timestamp > CACHE_TTL;
}

async function aggregateFinancialData(): Promise<FinancialPlanPayload> {
  try {
    const [assets, liabilities, incomes, expenses, cashflow] = await Promise.all([
      serverFinancialClient.assets.list(),
      serverFinancialClient.liabilities.list(),
      serverFinancialClient.incomes.list(),
      serverFinancialClient.expenses.list(),
      serverFinancialClient.cashflowSummary(),
    ]);

    const totalAssets = assets.reduce((sum, asset) => sum + asset.currentValue, 0);
    const totalLiabilities = liabilities.reduce((sum, liability) => sum + liability.currentBalance, 0);
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
    console.error('Failed to aggregate financial data:', error);
    throw new Error('Failed to aggregate financial data from Go service');
  }
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const mockMode = url.searchParams.get('mock') === 'true';
    const forceRefresh = url.searchParams.get('refresh') === 'true';

    const cacheKey = getCacheKey(request);
    const cachedEntry = cache.get(cacheKey);

    if (!forceRefresh && cachedEntry && !isExpired(cachedEntry)) {
      return NextResponse.json(cachedEntry.data, {
        headers: {
          'Cache-Control': 'public, max-age=300',
          'X-Cache-Status': 'HIT',
        },
      });
    }

    let data: FinancialPlanPayload;

    if (mockMode) {
      data = MOCK_DATA;
    } else {
      data = await aggregateFinancialData();
    }

    cache.set(cacheKey, {
      data,
      timestamp: Date.now(),
    });

    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, max-age=300',
        'X-Cache-Status': 'MISS',
        'X-Data-Source': mockMode ? 'MOCK' : 'LIVE',
      },
    });
  } catch (error) {
    console.error('Financial plan API error:', error);

    if (error instanceof Error && error.message.includes('Go service')) {
      return NextResponse.json(
        {
          error: 'Financial service unavailable',
          message: 'The Go financial service is currently unavailable. Try using mock mode by adding ?mock=true to your request.',
          remediation: 'Ensure the Go service is running or use mock data for development.',
        },
        {
          status: 503,
          headers: {
            'Retry-After': '60',
          },
        }
      );
    }

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'Failed to process financial plan request',
        remediation: 'Please try again later or contact support if the issue persists.',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const cacheKey = getCacheKey(request);
    cache.delete(cacheKey);

    return NextResponse.json(
      { message: 'Cache invalidated successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Cache invalidation error:', error);
    return NextResponse.json(
      { error: 'Failed to invalidate cache' },
      { status: 500 }
    );
  }
}