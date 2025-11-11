"use client";

import React from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useNetWorthTimeline } from "../store";
import { formatAge, formatCurrency } from "../utils";

interface NetWorthGraphProps {
  height?: number;
  className?: string;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;

    return (
      <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-lg">
        <p className="font-semibold text-gray-900">{`Age ${data.age} (${data.year})`}</p>
        {payload.map((entry: any, index: number) => (
          <p className="text-sm" key={index} style={{ color: entry.color }}>
            {`${entry.name}: ${formatCurrency(entry.value)}`}
          </p>
        ))}
      </div>
    );
  }

  return null;
};

const LoadingState = () => (
  <div className="flex h-64 items-center justify-center rounded-lg bg-gray-50">
    <div className="text-center">
      <div className="mx-auto mb-2 h-8 w-8 animate-spin rounded-full border-blue-600 border-b-2" />
      <p className="text-gray-600">Loading financial projection...</p>
    </div>
  </div>
);

const EmptyState = () => (
  <div className="flex h-64 items-center justify-center rounded-lg bg-gray-50">
    <div className="text-center">
      <div className="mb-2 text-gray-400">
        <svg
          className="mx-auto h-12 w-12"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
          />
        </svg>
      </div>
      <p className="font-medium text-gray-600">No Financial Data</p>
      <p className="text-gray-500 text-sm">
        Load your financial plan to see projections
      </p>
    </div>
  </div>
);

export function NetWorthGraph({
  height = 400,
  className = "",
}: NetWorthGraphProps) {
  const { timeline, displayOptions } = useNetWorthTimeline();

  if (timeline.length === 0) {
    return <EmptyState />;
  }

  const filteredTimeline = timeline.filter((point, index) => {
    switch (displayOptions.timeframe) {
      case "next5years":
        return index <= 5;
      case "next10years":
        return index <= 10;
      case "custom":
        return index <= (displayOptions.customYears || 10);
      case "untilRetirement":
      default:
        return true;
    }
  });

  return (
    <div className={`w-full ${className}`}>
      <ResponsiveContainer height={height} width="100%">
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
            label={{ value: "Age", position: "insideBottom", offset: -5 }}
            tickFormatter={(value) => `${value}`}
          />
          <YAxis
            label={{ value: "Amount ($)", angle: -90, position: "insideLeft" }}
            tickFormatter={(value) => formatCurrency(value, { compact: true })}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend />

          {displayOptions.showAssets && (
            <Area
              dataKey="totalAssets"
              fill="#10b981"
              fillOpacity={0.6}
              name="Total Assets"
              stackId="1"
              stroke="#10b981"
              type="monotone"
            />
          )}

          {displayOptions.showLiabilities && (
            <Area
              dataKey="totalLiabilities"
              fill="#ef4444"
              fillOpacity={0.6}
              name="Total Liabilities"
              stackId="2"
              stroke="#ef4444"
              type="monotone"
            />
          )}

          {displayOptions.showNetWorth && (
            <Line
              dataKey="netWorth"
              dot={{ fill: "#3b82f6", strokeWidth: 2, r: 4 }}
              name="Net Worth"
              stroke="#3b82f6"
              strokeWidth={3}
              type="monotone"
            />
          )}

          {displayOptions.showIncome && (
            <Line
              dataKey="monthlyIncome"
              name="Monthly Income"
              stroke="#8b5cf6"
              strokeDasharray="5 5"
              strokeWidth={2}
              type="monotone"
            />
          )}

          {displayOptions.showExpenses && (
            <Line
              dataKey="monthlyExpenses"
              name="Monthly Expenses"
              stroke="#f59e0b"
              strokeDasharray="5 5"
              strokeWidth={2}
              type="monotone"
            />
          )}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function NetWorthLineGraph({
  height = 400,
  className = "",
}: NetWorthGraphProps) {
  const { timeline, displayOptions } = useNetWorthTimeline();

  if (timeline.length === 0) {
    return <EmptyState />;
  }

  const filteredTimeline = timeline.filter((point, index) => {
    switch (displayOptions.timeframe) {
      case "next5years":
        return index <= 5;
      case "next10years":
        return index <= 10;
      case "custom":
        return index <= (displayOptions.customYears || 10);
      case "untilRetirement":
      default:
        return true;
    }
  });

  return (
    <div className={`w-full ${className}`}>
      <ResponsiveContainer height={height} width="100%">
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
            label={{ value: "Age", position: "insideBottom", offset: -5 }}
            tickFormatter={(value) => `${value}`}
          />
          <YAxis
            label={{ value: "Amount ($)", angle: -90, position: "insideLeft" }}
            tickFormatter={(value) => formatCurrency(value, { compact: true })}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend />

          {displayOptions.showAssets && (
            <Line
              dataKey="totalAssets"
              dot={{ fill: "#10b981", strokeWidth: 2, r: 3 }}
              name="Total Assets"
              stroke="#10b981"
              strokeWidth={2}
              type="monotone"
            />
          )}

          {displayOptions.showLiabilities && (
            <Line
              dataKey="totalLiabilities"
              dot={{ fill: "#ef4444", strokeWidth: 2, r: 3 }}
              name="Total Liabilities"
              stroke="#ef4444"
              strokeWidth={2}
              type="monotone"
            />
          )}

          {displayOptions.showNetWorth && (
            <Line
              dataKey="netWorth"
              dot={{ fill: "#3b82f6", strokeWidth: 2, r: 4 }}
              name="Net Worth"
              stroke="#3b82f6"
              strokeWidth={3}
              type="monotone"
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
