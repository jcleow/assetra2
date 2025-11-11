"use client";

import React from "react";
import { useFinancialPlan } from "../store";
import {
  formatCurrency,
  formatPercentage,
  getNetWorthColor,
  getNetWorthStatus,
} from "../utils";

interface FinancialSummaryProps {
  className?: string;
  showDetails?: boolean;
}

export function FinancialSummary({
  className = "",
  showDetails = true,
}: FinancialSummaryProps) {
  const { data: financialPlan, isLoading, error } = useFinancialPlan();

  if (isLoading) {
    return (
      <div className={`rounded-lg bg-white p-6 shadow-md ${className}`}>
        <div className="animate-pulse">
          <div className="mb-4 h-6 w-1/3 rounded bg-gray-200" />
          <div className="grid grid-cols-2 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i}>
                <div className="mb-2 h-4 w-1/2 rounded bg-gray-200" />
                <div className="h-8 w-3/4 rounded bg-gray-200" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={`rounded-lg border border-red-200 bg-red-50 p-6 ${className}`}
      >
        <h3 className="mb-2 font-semibold text-red-800">
          Error Loading Financial Data
        </h3>
        <p className="text-red-600 text-sm">{error}</p>
      </div>
    );
  }

  if (!financialPlan) {
    return (
      <div
        className={`rounded-lg border border-gray-200 bg-gray-50 p-6 ${className}`}
      >
        <div className="text-center">
          <div className="mb-3 text-gray-400">
            <svg
              className="mx-auto h-12 w-12"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
              />
            </svg>
          </div>
          <h3 className="mb-1 font-medium text-gray-700">No Financial Data</h3>
          <p className="text-gray-500 text-sm">
            Load your financial plan to see summary
          </p>
        </div>
      </div>
    );
  }

  const { summary } = financialPlan;
  const netWorthColor = getNetWorthColor(summary.netWorth);
  const netWorthStatus = getNetWorthStatus(summary.netWorth);

  return (
    <div className={`rounded-lg bg-white p-6 shadow-md ${className}`}>
      <h3 className="mb-4 font-semibold text-gray-900 text-lg">
        Financial Summary
      </h3>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Net Worth */}
        <div className="text-center md:text-left">
          <h4 className="mb-1 font-medium text-gray-500 text-sm">Net Worth</h4>
          <p className={`font-bold text-3xl ${netWorthColor}`}>
            {formatCurrency(summary.netWorth)}
          </p>
          <p className="mt-1 text-gray-600 text-sm">{netWorthStatus}</p>
        </div>

        {/* Savings Rate */}
        <div className="text-center md:text-left">
          <h4 className="mb-1 font-medium text-gray-500 text-sm">
            Savings Rate
          </h4>
          <p className="font-bold text-3xl text-blue-600">
            {formatPercentage(summary.savingsRate)}
          </p>
          <p className="mt-1 text-gray-600 text-sm">
            {formatCurrency(summary.monthlySavings)}/month
          </p>
        </div>
      </div>

      {showDetails && (
        <div className="mt-6 border-gray-200 border-t pt-6">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <div>
              <h5 className="mb-1 font-medium text-gray-500 text-xs uppercase tracking-wider">
                Total Assets
              </h5>
              <p className="font-semibold text-green-600 text-lg">
                {formatCurrency(summary.totalAssets)}
              </p>
            </div>

            <div>
              <h5 className="mb-1 font-medium text-gray-500 text-xs uppercase tracking-wider">
                Total Liabilities
              </h5>
              <p className="font-semibold text-lg text-red-600">
                {formatCurrency(summary.totalLiabilities)}
              </p>
            </div>

            <div>
              <h5 className="mb-1 font-medium text-gray-500 text-xs uppercase tracking-wider">
                Monthly Income
              </h5>
              <p className="font-semibold text-green-500 text-lg">
                {formatCurrency(summary.monthlyIncome)}
              </p>
            </div>

            <div>
              <h5 className="mb-1 font-medium text-gray-500 text-xs uppercase tracking-wider">
                Monthly Expenses
              </h5>
              <p className="font-semibold text-lg text-red-500">
                {formatCurrency(summary.monthlyExpenses)}
              </p>
            </div>
          </div>
        </div>
      )}

      {financialPlan.lastUpdated && (
        <div className="mt-4 border-gray-100 border-t pt-4">
          <p className="text-gray-500 text-xs">
            Last updated: {new Date(financialPlan.lastUpdated).toLocaleString()}
          </p>
        </div>
      )}
    </div>
  );
}
