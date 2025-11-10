'use client';

import React from 'react';
import { RefreshCcw, RefreshCw } from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  ReferenceDot,
  Tooltip,
} from 'recharts';
import { useNetWorthTimeline, useFinancialPlanningStore } from '@/features/financial-planning';

// Life event icons mapping
const LifeEventIcon = ({ type, x, y }: { type: string; x: number; y: number }) => {
  const iconMap = {
    graduation: '🎓',
    job: '💼',
    house: '🏠',
    marriage: '💍',
    baby: '👶',
    car: '🚗',
    vacation: '✈️',
    promotion: '📈',
  };

  return (
    <g>
      <circle
        cx={x}
        cy={y}
        r={16}
        fill="#374151"
        stroke="#6B7280"
        strokeWidth={2}
      />
      <text
        x={x}
        y={y + 4}
        textAnchor="middle"
        fontSize="14"
        fill="white"
      >
        {iconMap[type as keyof typeof iconMap] || '📍'}
      </text>
    </g>
  );
};

// Sample life events for demo
const sampleLifeEvents = [
  { age: 28, type: 'graduation', label: 'Graduate School' },
  { age: 30, type: 'job', label: 'New Job' },
  { age: 32, type: 'marriage', label: 'Marriage' },
  { age: 34, type: 'house', label: 'Buy House' },
  { age: 36, type: 'baby', label: 'First Child' },
  { age: 38, type: 'car', label: 'New Car' },
  { age: 42, type: 'promotion', label: 'Promotion' },
  { age: 45, type: 'vacation', label: 'Family Vacation' },
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-gray-800 border border-gray-600 rounded-lg p-3 shadow-lg">
        <p className="text-gray-300 text-sm">{`Age ${data.age} (${data.year})`}</p>
        <p className="text-blue-400 font-semibold">
          Net Worth: ${data.netWorth.toLocaleString()}
        </p>
        <p className="text-green-400 text-sm">
          Assets: ${data.totalAssets.toLocaleString()}
        </p>
        <p className="text-red-400 text-sm">
          Liabilities: ${data.totalLiabilities.toLocaleString()}
        </p>
      </div>
    );
  }
  return null;
};

export function LifeEventTimelineChart() {
  const { timeline, projectionSettings } = useNetWorthTimeline();
  const {
    refreshData,
    runProjection,
    isLoading,
    isProjecting,
    projectionError,
  } = useFinancialPlanningStore();

  // Debug: Log the first few timeline points
  if (timeline.length > 0) {
    console.log('Timeline first 3 points:', timeline.slice(0, 3));
  }

  if (timeline.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-800 rounded-lg">
        <div className="text-center">
          <div className="text-gray-500 mb-2">
            <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <p className="text-gray-400 font-medium">No Financial Data</p>
          <p className="text-gray-500 text-sm">Load your financial plan to see projections</p>
        </div>
      </div>
    );
  }

  // Filter timeline to show relevant timeframe
  const filteredTimeline = timeline.filter((point, index) => index <= 20); // Next 20 years

  return (
    <div className="h-full flex flex-col">
      <div className="mb-4 flex-shrink-0 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-white mb-1">Net Worth Projection</h3>
          <p className="text-gray-400 text-sm">Next 20 Years</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => runProjection()}
            disabled={isProjecting}
            className="p-2 rounded-full hover:bg-gray-700 text-gray-400 hover:text-white transition-colors disabled:opacity-50"
            title="Recompute projection"
          >
            <RefreshCcw className={`w-4 h-4 ${isProjecting ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={refreshData}
            disabled={isLoading}
            className="p-2 rounded-full hover:bg-gray-700 text-gray-400 hover:text-white transition-colors disabled:opacity-50"
            title="Refresh financial data"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {projectionError ? (
        <div className="mb-3 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-100">
          <div className="flex items-center justify-between gap-3">
            <span>{projectionError}</span>
            <button
              type="button"
              onClick={() => runProjection()}
              className="rounded border border-red-400/60 px-2 py-1 text-xs uppercase tracking-wide"
            >
              Retry
            </button>
          </div>
        </div>
      ) : null}

      <div className="relative flex-1 bg-black rounded-lg p-4 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={filteredTimeline}
            margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
          >
            <defs>
              <linearGradient id="netWorthGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#60A5FA" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#60A5FA" stopOpacity={0.1}/>
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="2 2"
              stroke="#374151"
              opacity={0.5}
            />
            <XAxis
              dataKey="age"
              stroke="#9CA3AF"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="#9CA3AF"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              domain={[0, 'dataMax']}
              tickFormatter={(value) => {
                if (value <= 0) return '';
                if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
                if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
                return `$${value}`;
              }}
            />

            {/* Net Worth Area */}
            <Area
              type="monotone"
              dataKey="netWorth"
              stroke="#60A5FA"
              strokeWidth={3}
              fill="url(#netWorthGradient)"
              dot={false}
              activeDot={{ r: 6, fill: '#60A5FA' }}
            />

            {/* Life Event Icons */}
            {sampleLifeEvents.map((event, index) => {
              const dataPoint = filteredTimeline.find(point => point.age === event.age);
              if (!dataPoint) return null;

              return (
                <ReferenceDot
                  key={index}
                  x={event.age}
                  y={dataPoint.netWorth}
                  r={0}
                  fill="transparent"
                  stroke="transparent"
                />
              );
            })}

            {/* Custom Tooltip */}
            <Tooltip content={<CustomTooltip />} />
          </AreaChart>
        </ResponsiveContainer>
        {isProjecting ? (
          <div className="absolute inset-0 rounded-lg bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center gap-2 text-gray-200">
            <RefreshCcw className="h-5 w-5 animate-spin" />
            <span className="text-xs uppercase tracking-wide">Recomputing projection…</span>
          </div>
        ) : null}
      </div>
    </div>
  );
}
