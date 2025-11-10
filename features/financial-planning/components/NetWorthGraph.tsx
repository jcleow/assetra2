'use client';

import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';
import { useNetWorthTimeline } from '../store';
import { formatCurrency, formatAge } from '../utils';

interface NetWorthGraphProps {
  height?: number;
  className?: string;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;

    return (
      <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-lg">
        <p className="font-semibold text-gray-900">{`Age ${data.age} (${data.year})`}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {`${entry.name}: ${formatCurrency(entry.value)}`}
          </p>
        ))}
      </div>
    );
  }

  return null;
};

const LoadingState = () => (
  <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg">
    <div className="text-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
      <p className="text-gray-600">Loading financial projection...</p>
    </div>
  </div>
);

const EmptyState = () => (
  <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg">
    <div className="text-center">
      <div className="text-gray-400 mb-2">
        <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      </div>
      <p className="text-gray-600 font-medium">No Financial Data</p>
      <p className="text-gray-500 text-sm">Load your financial plan to see projections</p>
    </div>
  </div>
);

export function NetWorthGraph({ height = 400, className = '' }: NetWorthGraphProps) {
  const { timeline, displayOptions } = useNetWorthTimeline();

  if (timeline.length === 0) {
    return <EmptyState />;
  }

  const filteredTimeline = timeline.filter((point, index) => {
    switch (displayOptions.timeframe) {
      case 'next5years':
        return index <= 5;
      case 'next10years':
        return index <= 10;
      case 'custom':
        return index <= (displayOptions.customYears || 10);
      case 'untilRetirement':
      default:
        return true;
    }
  });

  return (
    <div className={`w-full ${className}`}>
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart
          data={filteredTimeline}
          margin={{
            top: 20,
            right: 30,
            left: 20,
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="age"
            tickFormatter={(value) => `${value}`}
            label={{ value: 'Age', position: 'insideBottom', offset: -5 }}
          />
          <YAxis
            tickFormatter={(value) => formatCurrency(value, { compact: true })}
            label={{ value: 'Amount ($)', angle: -90, position: 'insideLeft' }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend />

          {displayOptions.showAssets && (
            <Area
              type="monotone"
              dataKey="totalAssets"
              stackId="1"
              stroke="#10b981"
              fill="#10b981"
              fillOpacity={0.6}
              name="Total Assets"
            />
          )}

          {displayOptions.showLiabilities && (
            <Area
              type="monotone"
              dataKey="totalLiabilities"
              stackId="2"
              stroke="#ef4444"
              fill="#ef4444"
              fillOpacity={0.6}
              name="Total Liabilities"
            />
          )}

          {displayOptions.showNetWorth && (
            <Line
              type="monotone"
              dataKey="netWorth"
              stroke="#3b82f6"
              strokeWidth={3}
              dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
              name="Net Worth"
            />
          )}

          {displayOptions.showIncome && (
            <Line
              type="monotone"
              dataKey="monthlyIncome"
              stroke="#8b5cf6"
              strokeWidth={2}
              strokeDasharray="5 5"
              name="Monthly Income"
            />
          )}

          {displayOptions.showExpenses && (
            <Line
              type="monotone"
              dataKey="monthlyExpenses"
              stroke="#f59e0b"
              strokeWidth={2}
              strokeDasharray="5 5"
              name="Monthly Expenses"
            />
          )}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function NetWorthLineGraph({ height = 400, className = '' }: NetWorthGraphProps) {
  const { timeline, displayOptions } = useNetWorthTimeline();

  if (timeline.length === 0) {
    return <EmptyState />;
  }

  const filteredTimeline = timeline.filter((point, index) => {
    switch (displayOptions.timeframe) {
      case 'next5years':
        return index <= 5;
      case 'next10years':
        return index <= 10;
      case 'custom':
        return index <= (displayOptions.customYears || 10);
      case 'untilRetirement':
      default:
        return true;
    }
  });

  return (
    <div className={`w-full ${className}`}>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart
          data={filteredTimeline}
          margin={{
            top: 20,
            right: 30,
            left: 20,
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="age"
            tickFormatter={(value) => `${value}`}
            label={{ value: 'Age', position: 'insideBottom', offset: -5 }}
          />
          <YAxis
            tickFormatter={(value) => formatCurrency(value, { compact: true })}
            label={{ value: 'Amount ($)', angle: -90, position: 'insideLeft' }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend />

          {displayOptions.showAssets && (
            <Line
              type="monotone"
              dataKey="totalAssets"
              stroke="#10b981"
              strokeWidth={2}
              dot={{ fill: '#10b981', strokeWidth: 2, r: 3 }}
              name="Total Assets"
            />
          )}

          {displayOptions.showLiabilities && (
            <Line
              type="monotone"
              dataKey="totalLiabilities"
              stroke="#ef4444"
              strokeWidth={2}
              dot={{ fill: '#ef4444', strokeWidth: 2, r: 3 }}
              name="Total Liabilities"
            />
          )}

          {displayOptions.showNetWorth && (
            <Line
              type="monotone"
              dataKey="netWorth"
              stroke="#3b82f6"
              strokeWidth={3}
              dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
              name="Net Worth"
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}