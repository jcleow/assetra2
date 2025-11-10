# Financial Planning Module

A comprehensive, standalone module for managing financial planning state, data visualization, and user interactions. Designed for modularity, tree-shaking, and seamless integration with chat-based AI interactions.

## Features

- **State Management**: Zustand-powered store with optimistic updates and persistence
- **Interactive Charts**: Recharts-based net worth projections with customizable display options
- **Type Safety**: Full TypeScript support with runtime validation
- **Tree Shakeable**: Import only what you need
- **Persistence**: Local storage helpers for offline functionality
- **Testing**: Comprehensive unit test coverage

## Quick Start

```tsx
import {
  useFinancialPlan,
  NetWorthGraph,
  formatCurrency
} from '@/features/financial-planning';

function FinancialDashboard() {
  const { data, isLoading, refresh } = useFinancialPlan();

  if (isLoading) return <div>Loading...</div>;

  return (
    <div>
      <h1>Net Worth: {formatCurrency(data?.summary.netWorth || 0)}</h1>
      <NetWorthGraph height={400} />
      <button onClick={refresh}>Refresh Data</button>
    </div>
  );
}
```

## Core Components

### State Management

- `useFinancialPlan()` - Access financial data with loading/error states
- `useNetWorthTimeline()` - Projection settings and timeline data
- `useFinancialPlanningStore` - Direct store access for advanced use cases

### UI Components

- `NetWorthGraph` - Interactive area chart with timeline projections
- `NetWorthLineGraph` - Line chart variant for cleaner visualization
- `FinancialSummary` - Summary cards with key financial metrics
- `ProjectionControls` - Interactive controls for projection settings
- `FinancialPlanProvider` - React context provider for module configuration

### Utilities

- `formatCurrency()` - Flexible currency formatting with compact notation
- `formatPercentage()` - Percentage formatting
- `calculateNetWorth()` - Net worth calculations
- `validateProjectionSettings()` - Input validation for projections

## API Integration

The module consumes data from `/api/financial-plan` which aggregates:

- Assets from the Go financial service
- Liabilities, incomes, and expenses
- Calculated summaries and projections

```tsx
// Automatic data fetching
const { data, isLoading, error, refresh } = useFinancialPlan();

// Manual data loading
await refresh();
```

## Projection System

Configure and customize financial projections:

```tsx
const {
  projectionSettings,
  updateProjectionSettings,
  timeline
} = useNetWorthTimeline();

// Update projection parameters
updateProjectionSettings({
  currentAge: 30,
  retirementAge: 65,
  averageReturnRate: 0.07,
  inflationRate: 0.03,
});

// Access calculated timeline
console.log(timeline); // Array of NetWorthTimelinePoint[]
```

## Chart Customization

```tsx
const { displayOptions, updateDisplayOptions } = useNetWorthTimeline();

// Toggle chart elements
updateDisplayOptions({
  showAssets: true,
  showLiabilities: true,
  showNetWorth: true,
  timeframe: 'untilRetirement',
});

// Render with custom height
<NetWorthGraph height={500} className="my-custom-chart" />
```

## Persistence

The module includes local storage helpers for offline functionality:

```tsx
import { usePersistence } from '@/features/financial-planning';

const persistence = usePersistence();

// Export user data
const exportData = persistence.exportData();

// Import user data
const success = persistence.importData(jsonString);

// Clear all local data
persistence.clearAllData();
```

## Chat Integration

Designed to work seamlessly with AI chat interactions:

```tsx
import { useFinancialPlan, formatConfirmationSummary } from '@/features/financial-planning';

function ChatFinancialUpdater({ changes }) {
  const { data } = useFinancialPlan();

  // Generate confirmation text for AI
  const confirmationText = formatConfirmationSummary(changes);

  return (
    <div>
      <p>{confirmationText}</p>
      {/* Apply changes to financial plan */}
    </div>
  );
}
```

## Testing

Run the test suite:

```bash
npm test features/financial-planning
```

The module includes comprehensive tests for:
- Store state management and actions
- Utility functions and calculations
- Component rendering and interactions
- Data persistence and validation

## Architecture

```
features/financial-planning/
├── store.ts              # Zustand store with hooks
├── components/
│   ├── NetWorthGraph.tsx      # Chart components
│   ├── FinancialSummary.tsx   # Summary display
│   ├── ProjectionControls.tsx # Settings controls
│   └── FinancialPlanProvider.tsx # React context
├── utils.ts              # Formatters and calculations
├── persistence.ts        # Local storage helpers
├── types.ts             # TypeScript interfaces
├── __tests__/           # Unit tests
├── index.ts             # Barrel exports
└── README.md            # This file
```

## Module Dependencies

- `zustand` - State management
- `recharts` - Data visualization
- `zod` - Runtime validation (via API types)
- React 18+ - UI framework

## Contributing

The module is designed for:
- **Tree-shaking**: Import only needed functions
- **Type safety**: Full TypeScript coverage
- **Testing**: Comprehensive test coverage
- **Documentation**: JSDoc comments for all exports
- **Modularity**: No circular dependencies between components

Add new features by following the established patterns:
1. Add functionality to appropriate files
2. Export through `index.ts` with proper categorization
3. Include unit tests
4. Update this README with usage examples