# Frontend Development Guide

This guide provides frontend engineers with everything needed to effectively consume the Go service and build financial planning features.

## Quick Start

### Prerequisites
- Node.js 20+
- pnpm (automatically enabled via corepack)
- Go 1.22+ (for running the backend service)

### Setup (10-minute onboarding)

1. **Clone and install dependencies:**
   ```bash
   git clone <repo-url>
   cd assetra2
   pnpm install
   ```

2. **Configure environment:**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your settings (defaults work for local development)
   ```

3. **Start the full stack:**
   ```bash
   pnpm dev:full
   ```
   This command starts both Next.js (port 3000) and Go service (port 8080) concurrently.

4. **Verify setup:**
   - Visit http://localhost:3000
   - Look for green "Go service" indicator in the bottom right
   - Test the proxy: `curl http://localhost:3000/go-api/health`

## Architecture Overview

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Next.js App  │    │   Proxy Layer    │    │   Go Service    │
│                 │    │                  │    │                 │
│  • React hooks │◄──►│  /go-api/* ──────┼───►│  • REST API     │
│  • SWR cache   │    │  rewrites        │    │  • In-memory    │
│  • TypeScript  │    │  (CORS-free)     │    │    repository   │
│  • Zustand     │    │                  │    │  • JSON         │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

### Key Components

- **Financial Client** (`lib/financial/client.ts`): Type-safe HTTP client for Go service
- **React Hooks** (`hooks/use-financial-data.ts`): SWR-powered hooks with optimistic updates
- **Types & Validation** (`lib/financial/types.ts`): Zod schemas for runtime validation
- **Toast System** (`components/toast.tsx`): User feedback for errors and confirmations

## Financial Hooks Usage

### Assets Management

```typescript
import { useAssets } from '@/hooks/use-financial-data';

function AssetsManager() {
  const {
    data: assets,
    isLoading,
    error,
    createItem,
    updateItem,
    deleteItem
  } = useAssets();

  // Create a new asset
  const handleCreate = async () => {
    try {
      const newAsset = await createItem({
        name: 'Investment Portfolio',
        category: 'brokerage',
        currentValue: 50000,
        annualGrowthRate: 0.07,
        notes: '401k rollover'
      });
      // Optimistic update already applied!
      console.log('Created:', newAsset);
    } catch (error) {
      // Error toast automatically shown
      // State automatically rolled back
    }
  };

  // Update existing asset
  const handleUpdate = async (assetId: string) => {
    try {
      await updateItem({
        id: assetId,
        currentValue: 75000 // Partial update
      });
    } catch (error) {
      // Automatic rollback on failure
    }
  };

  if (isLoading) return <div>Loading assets...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      {assets?.map(asset => (
        <div key={asset.id}>
          <h3>{asset.name}</h3>
          <p>${asset.currentValue.toLocaleString()}</p>
          <button onClick={() => handleUpdate(asset.id)}>
            Update Value
          </button>
          <button onClick={() => deleteItem(asset.id)}>
            Delete
          </button>
        </div>
      ))}
      <button onClick={handleCreate}>Add Asset</button>
    </div>
  );
}
```

### Liabilities Management

```typescript
import { useLiabilities } from '@/hooks/use-financial-data';

function LiabilitiesManager() {
  const { data: liabilities, createItem, updateItem } = useLiabilities();

  const addCreditCard = async () => {
    await createItem({
      name: 'Chase Sapphire',
      category: 'credit-card',
      currentBalance: 2500,
      interestRateApr: 0.18,
      minimumPayment: 100,
      notes: 'Travel rewards card'
    });
  };

  const payDown = async (id: string, currentBalance: number) => {
    await updateItem({
      id,
      currentBalance: currentBalance - 500 // Pay down $500
    });
  };

  return (
    <div>
      {liabilities?.map(liability => (
        <div key={liability.id}>
          <h3>{liability.name}</h3>
          <p>Balance: ${liability.currentBalance}</p>
          <p>APR: {(liability.interestRateApr * 100).toFixed(1)}%</p>
          <button onClick={() => payDown(liability.id, liability.currentBalance)}>
            Pay Down $500
          </button>
        </div>
      ))}
      <button onClick={addCreditCard}>Add Credit Card</button>
    </div>
  );
}
```

### Income & Expenses

```typescript
import { useIncomes, useExpenses } from '@/hooks/use-financial-data';

function CashflowManager() {
  const { data: incomes, createItem: createIncome } = useIncomes();
  const { data: expenses, createItem: createExpense } = useExpenses();

  const addSalary = async () => {
    await createIncome({
      source: 'Software Engineering',
      amount: 8000,
      frequency: 'monthly',
      startDate: new Date().toISOString(),
      category: 'employment'
    });
  };

  const addRent = async () => {
    await createExpense({
      payee: 'Property Management Co',
      amount: 2000,
      frequency: 'monthly',
      category: 'housing'
    });
  };

  return (
    <div>
      <section>
        <h2>Income Streams</h2>
        {incomes?.map(income => (
          <div key={income.id}>
            {income.source}: ${income.amount}/{income.frequency}
          </div>
        ))}
        <button onClick={addSalary}>Add Salary</button>
      </section>

      <section>
        <h2>Expenses</h2>
        {expenses?.map(expense => (
          <div key={expense.id}>
            {expense.payee}: ${expense.amount}/{expense.frequency}
          </div>
        ))}
        <button onClick={addRent}>Add Rent</button>
      </section>
    </div>
  );
}
```

### Cash Flow Summary

```typescript
import { useCashFlowSnapshot } from '@/hooks/use-financial-data';

function CashFlowSummary() {
  const { data: cashflow, isLoading } = useCashFlowSnapshot();

  if (isLoading) return <div>Loading cash flow...</div>;

  return (
    <div>
      <h2>Monthly Cash Flow</h2>
      <div>Income: ${cashflow?.summary.monthlyIncome.toLocaleString()}</div>
      <div>Expenses: ${cashflow?.summary.monthlyExpenses.toLocaleString()}</div>
      <div>
        Net: ${cashflow?.summary.netMonthly.toLocaleString()}
        {cashflow && cashflow.summary.netMonthly > 0 ? ' 📈' : ' 📉'}
      </div>
    </div>
  );
}
```

## Error Handling Patterns

### Automatic Error Handling

All financial hooks automatically handle errors with:
- **Toast notifications** with descriptive messages
- **Optimistic rollbacks** when operations fail
- **Retry-friendly error formats** with HTTP status codes

```typescript
// This will automatically show error toast and rollback on failure
const { createItem } = useAssets();

try {
  await createItem({ /* invalid data */ });
} catch (error) {
  // Toast already shown, state already rolled back
  // You can add custom error handling here if needed
  console.error('Additional logging:', error);
}
```

### Custom Error Handling

```typescript
import { FinancialClientError } from '@/lib/financial';

const handleCreateAsset = async (data: AssetCreatePayload) => {
  try {
    await createItem(data);
  } catch (error) {
    if (error instanceof FinancialClientError) {
      // Structured error with HTTP status and details
      if (error.status === 400) {
        // Validation error - data shape issue
        setFormErrors(error.details);
      } else if (error.status >= 500) {
        // Server error - retry later
        scheduleRetry();
      }
    }
    // Re-throw to maintain automatic toast/rollback behavior
    throw error;
  }
};
```

## Direct Client Usage (Advanced)

For cases where hooks aren't suitable (server-side, background tasks):

```typescript
import { financialClient } from '@/lib/financial/client';

// Direct API calls
const assets = await financialClient.assets.list();
const asset = await financialClient.assets.get('asset-123');
const created = await financialClient.assets.create({
  name: 'Stocks',
  category: 'brokerage',
  currentValue: 25000,
  annualGrowthRate: 0.08
});

// Cash flow summary
const snapshot = await financialClient.cashflowSummary();
console.log(`Monthly net: $${snapshot.summary.netMonthly}`);
```

## TypeScript Integration

### Type Safety

```typescript
import type {
  Asset,
  AssetCreatePayload,
  Liability,
  Income,
  Expense,
  CashFlowSnapshot
} from '@/lib/financial';

// All API responses are fully typed
function displayAsset(asset: Asset) {
  // TypeScript knows all these properties exist
  return `${asset.name}: $${asset.currentValue} (${asset.category})`;
}

// Payload types enforce required fields
const validPayload: AssetCreatePayload = {
  name: 'Required field',
  category: 'Required field',
  currentValue: 1000, // Required number
  annualGrowthRate: 0.05, // Required number
  notes: 'Optional field' // Optional
};
```

### Runtime Validation

All responses from the Go service are validated at runtime using Zod schemas:

```typescript
// This will throw if the API returns invalid data
const assets = await financialClient.assets.list();
// TypeScript + Runtime validation ensures data integrity
```

## State Management Patterns

### Optimistic Updates

```typescript
// ✅ Recommended: Use hooks with built-in optimistic updates
const { updateItem } = useAssets();
await updateItem({ id: 'asset-1', currentValue: 60000 });
// UI updates immediately, rolls back if request fails

// ❌ Avoid: Manual state management
const [assets, setAssets] = useState([]);
// Manual optimistic update logic is error-prone
```

### Cache Invalidation

```typescript
import { useLiabilities } from '@/hooks/use-financial-data';

function PaymentForm() {
  const { updateItem, refresh } = useLiabilities();

  const handlePayment = async () => {
    await updateItem({ id: 'card-1', currentBalance: 1500 });
    // Cache automatically updated via optimistic update

    // Manual refresh if needed (rarely required)
    // refresh();
  };
}
```

## Common Patterns & Best Practices

### Loading States

```typescript
function AssetsView() {
  const { data, isLoading, isValidating, error } = useAssets();

  if (error) {
    return <ErrorDisplay error={error} />;
  }

  if (isLoading) {
    return <AssetsSkeleton />;
  }

  return (
    <div>
      {isValidating && <SyncIndicator />}
      <AssetsList assets={data || []} />
    </div>
  );
}
```

### Form Integration

```typescript
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { assetCreateSchema } from '@/lib/financial/types';

function AssetForm() {
  const { createItem } = useAssets();
  const form = useForm({
    resolver: zodResolver(assetCreateSchema)
  });

  const onSubmit = async (data: AssetCreatePayload) => {
    try {
      await createItem(data);
      form.reset();
    } catch (error) {
      // Error handling already done by hook
    }
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      {/* Form fields */}
    </form>
  );
}
```

### Computed Values

```typescript
import { computeMonthlyCashFlow } from '@/lib/financial/types';

function NetWorthSummary() {
  const { data: assets } = useAssets();
  const { data: liabilities } = useLiabilities();
  const { data: cashflow } = useCashFlowSnapshot();

  const totalAssets = useMemo(() =>
    assets?.reduce((sum, asset) => sum + asset.currentValue, 0) || 0
  , [assets]);

  const totalLiabilities = useMemo(() =>
    liabilities?.reduce((sum, liability) => sum + liability.currentBalance, 0) || 0
  , [liabilities]);

  const netWorth = totalAssets - totalLiabilities;

  return (
    <div>
      <div>Assets: ${totalAssets.toLocaleString()}</div>
      <div>Liabilities: ${totalLiabilities.toLocaleString()}</div>
      <div>Net Worth: ${netWorth.toLocaleString()}</div>
      {cashflow && (
        <div>Monthly Net: ${cashflow.summary.netMonthly.toLocaleString()}</div>
      )}
    </div>
  );
}
```

## Testing Patterns

### Mock Data for Development

```typescript
// Create sample fixtures for consistent testing
const sampleAssets: Asset[] = [
  {
    id: 'asset-1',
    name: 'Investment Portfolio',
    category: 'brokerage',
    currentValue: 50000,
    annualGrowthRate: 0.07,
    notes: '401k',
    updatedAt: '2024-01-01T00:00:00Z'
  }
];

// Use in Storybook or development mode
function AssetsList({ assets = sampleAssets }: { assets?: Asset[] }) {
  return (
    <div>
      {assets.map(asset => <AssetCard key={asset.id} asset={asset} />)}
    </div>
  );
}
```

### Unit Testing Hooks

```typescript
import { renderHook, waitFor } from '@testing-library/react';
import { useAssets } from '@/hooks/use-financial-data';

test('useAssets loads data correctly', async () => {
  const { result } = renderHook(() => useAssets());

  await waitFor(() => {
    expect(result.current.isLoading).toBe(false);
  });

  expect(result.current.data).toEqual(expect.any(Array));
});
```

## Troubleshooting

### Common Issues

#### "Go service unreachable" indicator

**Symptoms:** Red indicator in bottom right, API calls fail
**Solutions:**
1. Ensure Go service is running: `pnpm go:dev`
2. Check `GO_SERVICE_URL` in `.env.local` matches the service port
3. Restart Next.js after changing environment variables: `pnpm dev`
4. Verify proxy manually: `curl http://localhost:3000/go-api/health`

#### "TypeError: Failed to parse URL" errors

**Symptoms:** Console errors about URL parsing
**Solutions:**
1. Ensure you're using relative URLs in API calls: `/go-api/assets` not `localhost:8080/assets`
2. Use the provided hooks and client - they handle URL construction correctly
3. Check your `GO_SERVICE_URL` environment variable format

#### Optimistic updates not working

**Symptoms:** UI doesn't update immediately on changes
**Solutions:**
1. Ensure you're using the hook's mutation methods (`createItem`, `updateItem`, `deleteItem`)
2. Don't manually mutate the SWR cache - let the hooks handle it
3. Check for JavaScript errors that might prevent state updates

#### TypeScript errors with API responses

**Symptoms:** Type errors when accessing response properties
**Solutions:**
1. API responses are validated at runtime - check console for validation errors
2. Ensure Go service is returning data in the expected format
3. Update types in `lib/financial/types.ts` if API contracts have changed

### Development Tips

1. **Use the hooks**: They provide optimistic updates, error handling, and caching automatically
2. **Don't bypass the client**: Avoid raw `fetch()` calls to the Go service
3. **Handle loading states**: Always show appropriate loading indicators
4. **Leverage TypeScript**: Use provided types for full type safety
5. **Monitor the indicator**: The Go service status indicator shows real-time connectivity

### Debugging

```typescript
// Enable SWR debugging
import useSWR from 'swr';

// In development, log all SWR activity
if (process.env.NODE_ENV === 'development') {
  const originalFetcher = useSWR.default.fetcher;
  useSWR.default.fetcher = (...args) => {
    console.log('SWR fetch:', args);
    return originalFetcher(...args);
  };
}

// Enable financial client debugging
import { FinancialClient } from '@/lib/financial/client';

const client = new FinancialClient({
  baseUrl: process.env.GO_SERVICE_URL,
  defaultHeaders: {
    'X-Debug': 'true' // Enable server-side debugging
  }
});
```

For more help, check:
- Go service logs: `pnpm go:dev` output
- Browser DevTools Network tab for failed requests
- Console errors for client-side issues