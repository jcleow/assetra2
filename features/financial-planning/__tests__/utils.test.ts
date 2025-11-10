import { describe, it, expect } from 'vitest';
import {
  formatCurrency,
  formatPercentage,
  calculateNetWorth,
  calculateSavingsRate,
  validateProjectionSettings,
  calculateCompoundGrowth,
  calculateFutureValue,
  getNetWorthColor,
  getNetWorthStatus,
  formatConfirmationSummary,
} from '../utils';
import type { ProjectionSettings } from '../store';

describe('Financial Planning Utils', () => {
  describe('formatCurrency', () => {
    it('should format currency with default options', () => {
      expect(formatCurrency(1234.56)).toBe('$1,235');
      expect(formatCurrency(1000000)).toBe('$1,000,000');
      expect(formatCurrency(-500)).toBe('-$500');
    });

    it('should format currency with compact option', () => {
      expect(formatCurrency(1234567, { compact: true })).toBe('$1.2M');
      expect(formatCurrency(50000, { compact: true })).toBe('$50.0K');
      expect(formatCurrency(999, { compact: true })).toBe('$999');
    });

    it('should format currency with cents', () => {
      expect(formatCurrency(1234.56, { showCents: true })).toBe('$1,234.56');
      expect(formatCurrency(1000, { showCents: true })).toBe('$1,000.00');
    });

    it('should handle custom prefix', () => {
      expect(formatCurrency(1000, { prefix: '€' })).toBe('€1,000');
    });
  });

  describe('formatPercentage', () => {
    it('should format percentage with default decimals', () => {
      expect(formatPercentage(0.1234)).toBe('12.3%');
      expect(formatPercentage(0.5)).toBe('50.0%');
      expect(formatPercentage(1.5)).toBe('150.0%');
    });

    it('should format percentage with custom decimals', () => {
      expect(formatPercentage(0.1234, 2)).toBe('12.34%');
      expect(formatPercentage(0.1234, 0)).toBe('12%');
    });
  });

  describe('calculateNetWorth', () => {
    it('should calculate net worth correctly', () => {
      expect(calculateNetWorth(100000, 50000)).toBe(50000);
      expect(calculateNetWorth(50000, 100000)).toBe(-50000);
      expect(calculateNetWorth(0, 0)).toBe(0);
    });
  });

  describe('calculateSavingsRate', () => {
    it('should calculate savings rate correctly', () => {
      expect(calculateSavingsRate(8000, 6000)).toBe(0.25);
      expect(calculateSavingsRate(5000, 5000)).toBe(0);
      expect(calculateSavingsRate(4000, 5000)).toBe(-0.25);
    });

    it('should handle zero income', () => {
      expect(calculateSavingsRate(0, 1000)).toBe(0);
      expect(calculateSavingsRate(0, 0)).toBe(0);
    });
  });

  describe('validateProjectionSettings', () => {
    const validSettings: ProjectionSettings = {
      currentAge: 30,
      retirementAge: 65,
      projectionYears: 35,
      inflationRate: 0.03,
      averageReturnRate: 0.07,
    };

    it('should return no errors for valid settings', () => {
      const errors = validateProjectionSettings(validSettings);
      expect(errors).toEqual([]);
    });

    it('should validate current age', () => {
      const errors1 = validateProjectionSettings({
        ...validSettings,
        currentAge: 17,
      });
      expect(errors1).toContain('Current age must be between 18 and 100');

      const errors2 = validateProjectionSettings({
        ...validSettings,
        currentAge: 101,
      });
      expect(errors2).toContain('Current age must be between 18 and 100');
    });

    it('should validate retirement age', () => {
      const errors1 = validateProjectionSettings({
        ...validSettings,
        retirementAge: 29,
      });
      expect(errors1).toContain('Retirement age must be greater than current age');

      const errors2 = validateProjectionSettings({
        ...validSettings,
        retirementAge: 101,
      });
      expect(errors2).toContain('Retirement age must be 100 or less');
    });

    it('should validate inflation rate', () => {
      const errors1 = validateProjectionSettings({
        ...validSettings,
        inflationRate: -0.01,
      });
      expect(errors1).toContain('Inflation rate must be between 0% and 20%');

      const errors2 = validateProjectionSettings({
        ...validSettings,
        inflationRate: 0.21,
      });
      expect(errors2).toContain('Inflation rate must be between 0% and 20%');
    });

    it('should validate return rate', () => {
      const errors1 = validateProjectionSettings({
        ...validSettings,
        averageReturnRate: -0.51,
      });
      expect(errors1).toContain('Average return rate must be between -50% and 50%');

      const errors2 = validateProjectionSettings({
        ...validSettings,
        averageReturnRate: 0.51,
      });
      expect(errors2).toContain('Average return rate must be between -50% and 50%');
    });
  });

  describe('calculateCompoundGrowth', () => {
    it('should calculate compound growth correctly', () => {
      expect(calculateCompoundGrowth(1000, 0.07, 10)).toBeCloseTo(1967.15, 2);
      expect(calculateCompoundGrowth(10000, 0.05, 5)).toBeCloseTo(12762.82, 2);
      expect(calculateCompoundGrowth(1000, 0, 10)).toBe(1000);
    });
  });

  describe('calculateFutureValue', () => {
    it('should calculate future value of monthly contributions', () => {
      // $1000/month for 10 years at 7% annual return
      const result = calculateFutureValue(1000, 0.07, 10);
      expect(result).toBeCloseTo(173085.07, 2);
    });

    it('should handle zero return rate', () => {
      const result = calculateFutureValue(1000, 0, 10);
      expect(result).toBe(120000); // 1000 * 12 * 10
    });
  });

  describe('getNetWorthColor', () => {
    it('should return appropriate colors for different net worth levels', () => {
      expect(getNetWorthColor(1500000)).toBe('text-green-600'); // Millionaire+
      expect(getNetWorthColor(750000)).toBe('text-green-500'); // Half million+
      expect(getNetWorthColor(150000)).toBe('text-blue-600'); // Six figures
      expect(getNetWorthColor(50000)).toBe('text-blue-500'); // Positive
      expect(getNetWorthColor(-25000)).toBe('text-yellow-600'); // Small negative
      expect(getNetWorthColor(-100000)).toBe('text-red-600'); // Significant debt
    });
  });

  describe('getNetWorthStatus', () => {
    it('should return appropriate status for different net worth levels', () => {
      expect(getNetWorthStatus(1500000)).toBe('Millionaire! 🎉');
      expect(getNetWorthStatus(750000)).toBe('Half Millionaire 💰');
      expect(getNetWorthStatus(150000)).toBe('Six Figures 📈');
      expect(getNetWorthStatus(50000)).toBe('Positive Net Worth ✅');
      expect(getNetWorthStatus(-25000)).toBe('Building Wealth 🔨');
      expect(getNetWorthStatus(-100000)).toBe('High Debt 📉');
    });
  });

  describe('formatConfirmationSummary', () => {
    it('should format changes summary correctly', () => {
      const changes = {
        totalAssets: 150000,
        monthlyIncome: 9000,
      };

      const summary = formatConfirmationSummary(changes);
      expect(summary).toBe('Updating: Assets: $150,000, Monthly Income: $9,000');
    });

    it('should handle single change', () => {
      const changes = { totalLiabilities: 250000 };
      const summary = formatConfirmationSummary(changes);
      expect(summary).toBe('Updating: Liabilities: $250,000');
    });

    it('should handle no changes', () => {
      const changes = {};
      const summary = formatConfirmationSummary(changes);
      expect(summary).toBe('No changes to apply.');
    });

    it('should handle all possible changes', () => {
      const changes = {
        totalAssets: 100000,
        totalLiabilities: 50000,
        monthlyIncome: 8000,
        monthlyExpenses: 3000,
      };

      const summary = formatConfirmationSummary(changes);
      expect(summary).toBe(
        'Updating: Assets: $100,000, Liabilities: $50,000, Monthly Income: $8,000, Monthly Expenses: $3,000'
      );
    });
  });
});