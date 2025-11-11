"use client";

import React from "react";
import { useNetWorthTimeline } from "../store";
import { formatPercentage, validateProjectionSettings } from "../utils";

interface ProjectionControlsProps {
  className?: string;
}

export function ProjectionControls({
  className = "",
}: ProjectionControlsProps) {
  const {
    projectionSettings,
    displayOptions,
    updateProjectionSettings,
    updateDisplayOptions,
  } = useNetWorthTimeline();

  const validationErrors = validateProjectionSettings(projectionSettings);

  const handleProjectionChange = (
    field: keyof typeof projectionSettings,
    value: number
  ) => {
    updateProjectionSettings({ [field]: value });
  };

  const handleDisplayChange = (
    field: keyof typeof displayOptions,
    value: boolean | string | number
  ) => {
    updateDisplayOptions({ [field]: value });
  };

  return (
    <div className={`rounded-lg bg-white p-6 shadow-md ${className}`}>
      <h3 className="mb-4 font-semibold text-gray-900 text-lg">
        Projection Controls
      </h3>

      {validationErrors.length > 0 && (
        <div className="mb-6 rounded-lg border border-yellow-200 bg-yellow-50 p-4">
          <h4 className="mb-2 font-medium text-yellow-800">
            Validation Warnings
          </h4>
          <ul className="space-y-1 text-sm text-yellow-700">
            {validationErrors.map((error, index) => (
              <li key={index}>• {error}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Projection Settings */}
        <div>
          <h4 className="mb-3 font-medium text-base text-gray-800">
            Projection Settings
          </h4>
          <div className="space-y-4">
            <div>
              <label className="mb-2 block font-medium text-gray-700 text-sm">
                Current Age:{" "}
                <span className="font-semibold">
                  {projectionSettings.currentAge}
                </span>
              </label>
              <input
                className="slider h-2 w-full cursor-pointer appearance-none rounded-lg bg-gray-200"
                max="80"
                min="18"
                onChange={(e) =>
                  handleProjectionChange("currentAge", Number(e.target.value))
                }
                type="range"
                value={projectionSettings.currentAge}
              />
              <div className="mt-1 flex justify-between text-gray-500 text-xs">
                <span>18</span>
                <span>80</span>
              </div>
            </div>

            <div>
              <label className="mb-2 block font-medium text-gray-700 text-sm">
                Retirement Age:{" "}
                <span className="font-semibold">
                  {projectionSettings.retirementAge}
                </span>
              </label>
              <input
                className="slider h-2 w-full cursor-pointer appearance-none rounded-lg bg-gray-200"
                max="80"
                min="50"
                onChange={(e) =>
                  handleProjectionChange(
                    "retirementAge",
                    Number(e.target.value)
                  )
                }
                type="range"
                value={projectionSettings.retirementAge}
              />
              <div className="mt-1 flex justify-between text-gray-500 text-xs">
                <span>50</span>
                <span>80</span>
              </div>
            </div>

            <div>
              <label className="mb-2 block font-medium text-gray-700 text-sm">
                Average Return Rate:{" "}
                <span className="font-semibold">
                  {formatPercentage(projectionSettings.averageReturnRate)}
                </span>
              </label>
              <input
                className="slider h-2 w-full cursor-pointer appearance-none rounded-lg bg-gray-200"
                max="0.15"
                min="0"
                onChange={(e) =>
                  handleProjectionChange(
                    "averageReturnRate",
                    Number(e.target.value)
                  )
                }
                step="0.005"
                type="range"
                value={projectionSettings.averageReturnRate}
              />
              <div className="mt-1 flex justify-between text-gray-500 text-xs">
                <span>0%</span>
                <span>15%</span>
              </div>
            </div>

            <div>
              <label className="mb-2 block font-medium text-gray-700 text-sm">
                Inflation Rate:{" "}
                <span className="font-semibold">
                  {formatPercentage(projectionSettings.inflationRate)}
                </span>
              </label>
              <input
                className="slider h-2 w-full cursor-pointer appearance-none rounded-lg bg-gray-200"
                max="0.08"
                min="0"
                onChange={(e) =>
                  handleProjectionChange(
                    "inflationRate",
                    Number(e.target.value)
                  )
                }
                step="0.005"
                type="range"
                value={projectionSettings.inflationRate}
              />
              <div className="mt-1 flex justify-between text-gray-500 text-xs">
                <span>0%</span>
                <span>8%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Display Options */}
        <div>
          <h4 className="mb-3 font-medium text-base text-gray-800">
            Display Options
          </h4>
          <div className="space-y-4">
            <div>
              <label className="mb-2 block font-medium text-gray-700 text-sm">
                Timeframe
              </label>
              <select
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                onChange={(e) =>
                  handleDisplayChange("timeframe", e.target.value)
                }
                value={displayOptions.timeframe}
              >
                <option value="next5years">Next 5 Years</option>
                <option value="next10years">Next 10 Years</option>
                <option value="untilRetirement">Until Retirement</option>
                <option value="custom">Custom Years</option>
              </select>
            </div>

            {displayOptions.timeframe === "custom" && (
              <div>
                <label className="mb-2 block font-medium text-gray-700 text-sm">
                  Custom Years:{" "}
                  <span className="font-semibold">
                    {displayOptions.customYears || 10}
                  </span>
                </label>
                <input
                  className="slider h-2 w-full cursor-pointer appearance-none rounded-lg bg-gray-200"
                  max="50"
                  min="1"
                  onChange={(e) =>
                    handleDisplayChange("customYears", Number(e.target.value))
                  }
                  type="range"
                  value={displayOptions.customYears || 10}
                />
                <div className="mt-1 flex justify-between text-gray-500 text-xs">
                  <span>1</span>
                  <span>50</span>
                </div>
              </div>
            )}

            <div>
              <label className="mb-3 block font-medium text-gray-700 text-sm">
                Chart Lines
              </label>
              <div className="space-y-2">
                {[
                  {
                    key: "showAssets",
                    label: "Assets",
                    color: "text-green-600",
                  },
                  {
                    key: "showLiabilities",
                    label: "Liabilities",
                    color: "text-red-600",
                  },
                  {
                    key: "showNetWorth",
                    label: "Net Worth",
                    color: "text-blue-600",
                  },
                  {
                    key: "showIncome",
                    label: "Monthly Income",
                    color: "text-purple-600",
                  },
                  {
                    key: "showExpenses",
                    label: "Monthly Expenses",
                    color: "text-yellow-600",
                  },
                ].map(({ key, label, color }) => (
                  <label className="flex items-center" key={key}>
                    <input
                      checked={
                        displayOptions[
                          key as keyof typeof displayOptions
                        ] as boolean
                      }
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      onChange={(e) =>
                        handleDisplayChange(
                          key as keyof typeof displayOptions,
                          e.target.checked
                        )
                      }
                      type="checkbox"
                    />
                    <span className={`ml-2 font-medium text-sm ${color}`}>
                      {label}
                    </span>
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
