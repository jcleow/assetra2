import type { FinancialPlanPayload } from '@/app/api/financial-plan/route';
import type { NetWorthTimelinePoint, ProjectionSettings } from './store';

export interface CurrencyFormatOptions {
  compact?: boolean;
  showCents?: boolean;
  prefix?: string;
}

export function formatCurrency(
  amount: number,
  options: CurrencyFormatOptions = {}
): string {
  const { compact = false, showCents = false, prefix = '$' } = options;

  if (compact) {
    if (Math.abs(amount) >= 1000000) {
      return `${prefix}${(amount / 1000000).toFixed(1)}M`;
    }
    if (Math.abs(amount) >= 1000) {
      return `${prefix}${(amount / 1000).toFixed(1)}K`;
    }
  }

  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: showCents ? 2 : 0,
    maximumFractionDigits: showCents ? 2 : 0,
  });

  return formatter.format(amount);
}

export function formatPercentage(value: number, decimals = 1): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

export function formatAge(age: number): string {
  return `${age} years old`;
}

export function formatYear(year: number): string {
  return year.toString();
}

export function calculateNetWorth(assets: number, liabilities: number): number {
  return assets - liabilities;
}

export function calculateSavingsRate(income: number, expenses: number): number {
  if (income <= 0) return 0;
  const savings = income - expenses;
  return savings / income;
}

export function formatSummaryText(plan: FinancialPlanPayload): string {
  const { summary } = plan;
  const savingsRate = formatPercentage(summary.savingsRate);
  const netWorth = formatCurrency(summary.netWorth);
  const monthlySavings = formatCurrency(summary.monthlySavings);

  return `Current net worth: ${netWorth}. Saving ${monthlySavings}/month (${savingsRate} savings rate).`;
}

export function generateProjectionSummary(
  timeline: NetWorthTimelinePoint[],
  settings: ProjectionSettings
): string {
  if (timeline.length === 0) return 'No projection data available.';

  const current = timeline[0];
  const retirement = timeline.find(point => point.age >= settings.retirementAge) || timeline[timeline.length - 1];

  const currentNetWorth = formatCurrency(current.netWorth);
  const retirementNetWorth = formatCurrency(retirement.netWorth);
  const years = retirement.age - current.age;

  return `Projecting ${years} years: from ${currentNetWorth} now to ${retirementNetWorth} at age ${retirement.age}.`;
}

export function formatTimelineTooltip(point: NetWorthTimelinePoint): string {
  return [
    `Age ${point.age} (${point.year})`,
    `Net Worth: ${formatCurrency(point.netWorth)}`,
    `Assets: ${formatCurrency(point.totalAssets)}`,
    `Liabilities: ${formatCurrency(point.totalLiabilities)}`,
    `Monthly Income: ${formatCurrency(point.monthlyIncome)}`,
    `Monthly Expenses: ${formatCurrency(point.monthlyExpenses)}`,
    `Monthly Savings: ${formatCurrency(point.monthlySavings)}`,
  ].join('\n');
}

export function validateProjectionSettings(settings: ProjectionSettings): string[] {
  const errors: string[] = [];

  if (settings.currentAge < 18 || settings.currentAge > 100) {
    errors.push('Current age must be between 18 and 100');
  }

  if (settings.retirementAge <= settings.currentAge) {
    errors.push('Retirement age must be greater than current age');
  }

  if (settings.retirementAge > 100) {
    errors.push('Retirement age must be 100 or less');
  }

  if (settings.inflationRate < 0 || settings.inflationRate > 0.2) {
    errors.push('Inflation rate must be between 0% and 20%');
  }

  if (settings.averageReturnRate < -0.5 || settings.averageReturnRate > 0.5) {
    errors.push('Average return rate must be between -50% and 50%');
  }

  return errors;
}

export function calculateCompoundGrowth(
  principal: number,
  rate: number,
  time: number
): number {
  return principal * Math.pow(1 + rate, time);
}

export function calculateFutureValue(
  monthlyContribution: number,
  annualRate: number,
  years: number
): number {
  const monthlyRate = annualRate / 12;
  const totalMonths = years * 12;

  if (monthlyRate === 0) {
    return monthlyContribution * totalMonths;
  }

  return monthlyContribution * (Math.pow(1 + monthlyRate, totalMonths) - 1) / monthlyRate;
}

export function getNetWorthColor(netWorth: number): string {
  if (netWorth >= 1000000) return 'text-green-600'; // Millionaire
  if (netWorth >= 500000) return 'text-green-500';  // Half million
  if (netWorth >= 100000) return 'text-blue-600';   // Six figures
  if (netWorth >= 0) return 'text-blue-500';        // Positive
  if (netWorth >= -50000) return 'text-yellow-600'; // Small negative
  return 'text-red-600'; // Significant debt
}

export function getNetWorthStatus(netWorth: number): string {
  if (netWorth >= 1000000) return 'Millionaire! 🎉';
  if (netWorth >= 500000) return 'Half Millionaire 💰';
  if (netWorth >= 100000) return 'Six Figures 📈';
  if (netWorth >= 0) return 'Positive Net Worth ✅';
  if (netWorth >= -50000) return 'Building Wealth 🔨';
  return 'High Debt 📉';
}

export function formatConfirmationSummary(
  changes: Partial<FinancialPlanPayload['summary']>
): string {
  const parts: string[] = [];

  if (changes.totalAssets !== undefined) {
    parts.push(`Assets: ${formatCurrency(changes.totalAssets)}`);
  }

  if (changes.totalLiabilities !== undefined) {
    parts.push(`Liabilities: ${formatCurrency(changes.totalLiabilities)}`);
  }

  if (changes.monthlyIncome !== undefined) {
    parts.push(`Monthly Income: ${formatCurrency(changes.monthlyIncome)}`);
  }

  if (changes.monthlyExpenses !== undefined) {
    parts.push(`Monthly Expenses: ${formatCurrency(changes.monthlyExpenses)}`);
  }

  if (parts.length === 0) return 'No changes to apply.';

  return `Updating: ${parts.join(', ')}`;
}