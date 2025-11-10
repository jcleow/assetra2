'use client';

import React from 'react';
import { useFinancialPlan } from '../store';
import { formatCurrency, formatPercentage, getNetWorthColor, getNetWorthStatus } from '../utils';

interface FinancialSummaryProps {
  className?: string;
  showDetails?: boolean;
}

export function FinancialSummary({ className = '', showDetails = true }: FinancialSummaryProps) {
  const { data: financialPlan, isLoading, error } = useFinancialPlan();

  if (isLoading) {
    return (
      <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-2 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i}>
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-3/4"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-red-50 border border-red-200 rounded-lg p-6 ${className}`}>
        <h3 className="text-red-800 font-semibold mb-2">Error Loading Financial Data</h3>
        <p className="text-red-600 text-sm">{error}</p>
      </div>
    );
  }

  if (!financialPlan) {
    return (
      <div className={`bg-gray-50 border border-gray-200 rounded-lg p-6 ${className}`}>
        <div className="text-center">
          <div className="text-gray-400 mb-3">
            <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
          <h3 className="text-gray-700 font-medium mb-1">No Financial Data</h3>
          <p className="text-gray-500 text-sm">Load your financial plan to see summary</p>
        </div>
      </div>
    );
  }

  const { summary } = financialPlan;
  const netWorthColor = getNetWorthColor(summary.netWorth);
  const netWorthStatus = getNetWorthStatus(summary.netWorth);

  return (
    <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Financial Summary</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Net Worth */}
        <div className="text-center md:text-left">
          <h4 className="text-sm font-medium text-gray-500 mb-1">Net Worth</h4>
          <p className={`text-3xl font-bold ${netWorthColor}`}>
            {formatCurrency(summary.netWorth)}
          </p>
          <p className="text-sm text-gray-600 mt-1">{netWorthStatus}</p>
        </div>

        {/* Savings Rate */}
        <div className="text-center md:text-left">
          <h4 className="text-sm font-medium text-gray-500 mb-1">Savings Rate</h4>
          <p className="text-3xl font-bold text-blue-600">
            {formatPercentage(summary.savingsRate)}
          </p>
          <p className="text-sm text-gray-600 mt-1">
            {formatCurrency(summary.monthlySavings)}/month
          </p>
        </div>
      </div>

      {showDetails && (
        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <h5 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                Total Assets
              </h5>
              <p className="text-lg font-semibold text-green-600">
                {formatCurrency(summary.totalAssets)}
              </p>
            </div>

            <div>
              <h5 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                Total Liabilities
              </h5>
              <p className="text-lg font-semibold text-red-600">
                {formatCurrency(summary.totalLiabilities)}
              </p>
            </div>

            <div>
              <h5 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                Monthly Income
              </h5>
              <p className="text-lg font-semibold text-green-500">
                {formatCurrency(summary.monthlyIncome)}
              </p>
            </div>

            <div>
              <h5 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                Monthly Expenses
              </h5>
              <p className="text-lg font-semibold text-red-500">
                {formatCurrency(summary.monthlyExpenses)}
              </p>
            </div>
          </div>
        </div>
      )}

      {financialPlan.lastUpdated && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <p className="text-xs text-gray-500">
            Last updated: {new Date(financialPlan.lastUpdated).toLocaleString()}
          </p>
        </div>
      )}
    </div>
  );
}