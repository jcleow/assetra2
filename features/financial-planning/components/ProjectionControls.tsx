'use client';

import React from 'react';
import { useNetWorthTimeline } from '../store';
import { formatPercentage, validateProjectionSettings } from '../utils';

interface ProjectionControlsProps {
  className?: string;
}

export function ProjectionControls({ className = '' }: ProjectionControlsProps) {
  const { projectionSettings, displayOptions, updateProjectionSettings, updateDisplayOptions } = useNetWorthTimeline();

  const validationErrors = validateProjectionSettings(projectionSettings);

  const handleProjectionChange = (field: keyof typeof projectionSettings, value: number) => {
    updateProjectionSettings({ [field]: value });
  };

  const handleDisplayChange = (field: keyof typeof displayOptions, value: boolean | string | number) => {
    updateDisplayOptions({ [field]: value });
  };

  return (
    <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Projection Controls</h3>

      {validationErrors.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <h4 className="text-yellow-800 font-medium mb-2">Validation Warnings</h4>
          <ul className="text-yellow-700 text-sm space-y-1">
            {validationErrors.map((error, index) => (
              <li key={index}>• {error}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Projection Settings */}
        <div>
          <h4 className="text-base font-medium text-gray-800 mb-3">Projection Settings</h4>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Current Age: <span className="font-semibold">{projectionSettings.currentAge}</span>
              </label>
              <input
                type="range"
                min="18"
                max="80"
                value={projectionSettings.currentAge}
                onChange={(e) => handleProjectionChange('currentAge', Number(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>18</span>
                <span>80</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Retirement Age: <span className="font-semibold">{projectionSettings.retirementAge}</span>
              </label>
              <input
                type="range"
                min="50"
                max="80"
                value={projectionSettings.retirementAge}
                onChange={(e) => handleProjectionChange('retirementAge', Number(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>50</span>
                <span>80</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Average Return Rate: <span className="font-semibold">{formatPercentage(projectionSettings.averageReturnRate)}</span>
              </label>
              <input
                type="range"
                min="0"
                max="0.15"
                step="0.005"
                value={projectionSettings.averageReturnRate}
                onChange={(e) => handleProjectionChange('averageReturnRate', Number(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>0%</span>
                <span>15%</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Inflation Rate: <span className="font-semibold">{formatPercentage(projectionSettings.inflationRate)}</span>
              </label>
              <input
                type="range"
                min="0"
                max="0.08"
                step="0.005"
                value={projectionSettings.inflationRate}
                onChange={(e) => handleProjectionChange('inflationRate', Number(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>0%</span>
                <span>8%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Display Options */}
        <div>
          <h4 className="text-base font-medium text-gray-800 mb-3">Display Options</h4>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Timeframe</label>
              <select
                value={displayOptions.timeframe}
                onChange={(e) => handleDisplayChange('timeframe', e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="next5years">Next 5 Years</option>
                <option value="next10years">Next 10 Years</option>
                <option value="untilRetirement">Until Retirement</option>
                <option value="custom">Custom Years</option>
              </select>
            </div>

            {displayOptions.timeframe === 'custom' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Custom Years: <span className="font-semibold">{displayOptions.customYears || 10}</span>
                </label>
                <input
                  type="range"
                  min="1"
                  max="50"
                  value={displayOptions.customYears || 10}
                  onChange={(e) => handleDisplayChange('customYears', Number(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>1</span>
                  <span>50</span>
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">Chart Lines</label>
              <div className="space-y-2">
                {[
                  { key: 'showAssets', label: 'Assets', color: 'text-green-600' },
                  { key: 'showLiabilities', label: 'Liabilities', color: 'text-red-600' },
                  { key: 'showNetWorth', label: 'Net Worth', color: 'text-blue-600' },
                  { key: 'showIncome', label: 'Monthly Income', color: 'text-purple-600' },
                  { key: 'showExpenses', label: 'Monthly Expenses', color: 'text-yellow-600' },
                ].map(({ key, label, color }) => (
                  <label key={key} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={displayOptions[key as keyof typeof displayOptions] as boolean}
                      onChange={(e) => handleDisplayChange(key as keyof typeof displayOptions, e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className={`ml-2 text-sm font-medium ${color}`}>{label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}