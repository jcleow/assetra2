"use client";

import {
  Calendar,
  Loader2,
  Percent,
  PiggyBank,
  TrendingDown,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useWindowSize } from "usehooks-ts";
import { formatDistanceToNow } from "date-fns";
import {
  formatCurrency,
  formatPercentage,
  useFinancialPlanningStore,
} from "@/features/financial-planning";
import { usePropertyPlannerStore } from "@/features/property-planner/store";
import { usePropertyPlannerModalStore } from "@/features/property-planner/modal-store";
import {
  PROPERTY_PLANNER_MOCKS,
  PropertyPlannerType,
} from "./mock-data";
import { buildMortgageScenario } from "./calculations";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  BarChart,
  Bar,
} from "recharts";
import type {
  MortgageAmortization,
  MortgageInputs,
  PropertyPlannerScenario,
} from "@/lib/financial/types";
import { toast } from "@/components/toast";
import { usePropertyPlannerModalStore } from "@/features/property-planner/modal-store";

const MIN_CHART_HEIGHT_RATIO = 0.28;
const MIN_CHART_HEIGHT_PX = 280;

const cloneInputs = (inputs: MortgageInputs): MortgageInputs => ({
  ...inputs,
});

const inputsEqual = (a: MortgageInputs, b: MortgageInputs) =>
  a.loanAmount === b.loanAmount &&
  a.loanTermYears === b.loanTermYears &&
  a.borrowerType === b.borrowerType &&
  a.loanStartMonth === b.loanStartMonth &&
  a.fixedYears === b.fixedYears &&
  a.fixedRate === b.fixedRate &&
  a.floatingRate === b.floatingRate &&
  a.householdIncome === b.householdIncome &&
  a.otherDebt === b.otherDebt;

interface MortgageWizardProps {
  activeType: PropertyPlannerType;
}

export function MortgageWizard({ activeType }: MortgageWizardProps) {
  const [isComplete, setIsComplete] = useState(false);
  const storedMonthlyIncome = useFinancialPlanningStore(
    (state) => state.financialPlan?.summary.monthlyIncome ?? null
  );
  const scenarioFromStore = usePropertyPlannerStore(
    (state) => state.scenarios[activeType]
  );
  const saveScenario = usePropertyPlannerStore((state) => state.saveScenario);
  const scenario = scenarioFromStore ?? PROPERTY_PLANNER_MOCKS[activeType];
  const [propertyCategory, setPropertyCategory] = useState<"hdb" | "private">(
    activeType === "hdb" ? "hdb" : "private"
  );
  const [inputs, setInputs] = useState<MortgageInputs>(
    cloneInputs(scenario.inputs)
  );
  const isOverviewComplete = usePropertyPlannerStore(
    (state) => state.overviewComplete[activeType] ?? false
  );
  const setOverviewComplete = usePropertyPlannerStore(
    (state) => state.setOverviewComplete
  );
  const lastSavedAt = usePropertyPlannerStore(
    (state) => state.lastSavedAt[activeType] ?? scenario.updatedAt
  );
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isApplyingPlan, setIsApplyingPlan] = useState(false);
  const closePlannerModal = usePropertyPlannerModalStore((state) => state.close);

  useEffect(() => {
    setIsComplete(isOverviewComplete);
  }, [isOverviewComplete]);

  useEffect(() => {
    const nextInputs = cloneInputs(scenario.inputs);
    setInputs(nextInputs);
  }, [scenario.inputs]);

  useEffect(() => {
    setPropertyCategory(activeType === "hdb" ? "hdb" : "private");
  }, [activeType]);

  const { height: viewportHeight } = useWindowSize();
  const chartHeight = useMemo(() => {
    const safeHeight = viewportHeight ?? 0;
    if (safeHeight === 0) {
      return MIN_CHART_HEIGHT_PX;
    }
    return Math.max(safeHeight * MIN_CHART_HEIGHT_RATIO, MIN_CHART_HEIGHT_PX);
  }, [viewportHeight]);

  const calculation = useMemo(
    () => buildMortgageScenario(inputs),
    [inputs]
  );
  const amortizationData = calculation.amortization;
  const snapshot = calculation.snapshot;
  const { monthlyPayment, totalInterest, loanEndDate, msrRatio } = snapshot;

  const buildScenarioPayload = (): PropertyPlannerScenario => ({
    ...scenario,
    type: activeType,
    inputs,
    amortization: amortizationData,
    snapshot,
    updatedAt: new Date().toISOString(),
    lastRefreshed: new Date().toISOString(),
  });

  const handleSaveDraft = async () => {
    if (!hasUnsavedChanges && scenario.id) {
      toast({
        type: "info",
        description: "No changes to save.",
      });
      return scenario;
    }
    setIsSavingDraft(true);
    try {
      const payload = buildScenarioPayload();
      const saved = await saveScenario(activeType, payload);
      toast({ type: "success", description: "Draft saved." });
      return saved;
    } catch (error) {
      toast({
        type: "error",
        description: "Failed to save draft. Please try again.",
      });
      return null;
    } finally {
      setIsSavingDraft(false);
    }
  };

  const handleApplyPlan = async () => {
    if (hasUnsavedChanges) {
      toast({
        type: "error",
        description: "Save your draft before applying it to the plan.",
      });
      return;
    }
    let latestScenario = scenario;
    if (!scenario.id) {
      const saved = await handleSaveDraft();
      if (!saved) {
        return;
      }
      latestScenario = saved;
    }
    setIsApplyingPlan(true);
    try {
      const response = await fetch("/api/property-planner/apply", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ scenarioId: latestScenario.id }),
      });
      if (!response.ok) {
        throw new Error("Failed to apply scenario");
      }
      toast({
        type: "success",
        description: "Planner data applied to your financial plan.",
      });
      closePlannerModal();
    } catch (error) {
      console.error(error);
      toast({
        type: "error",
        description: "Could not apply scenario. Please try again.",
      });
    } finally {
      setIsApplyingPlan(false);
    }
  };

  const updateInputs = (changes: Partial<MortgageInputs>) =>
    setInputs((prev) => ({ ...prev, ...changes }));

  const {
    loanAmount,
    loanTermYears,
    borrowerType,
    loanStartMonth,
    fixedYears,
    fixedRate,
    floatingRate,
    householdIncome,
    otherDebt,
  } = inputs;

  const hasUnsavedChanges = !inputsEqual(inputs, scenario.inputs);

  const handleSubmit = () => {
    setIsComplete(true);
    setOverviewComplete(activeType, true);
  };

  const handleEdit = () => {
    setIsComplete(false);
    setOverviewComplete(activeType, false);
  };

  return (
    <div className="space-y-6">
      {isComplete ? null : (
        <section className="rounded-3xl border border-white/10 bg-gray-900 p-6 shadow-xl">
          <header className="mb-6 space-y-2">
            <p className="text-xs uppercase tracking-[0.18em] text-gray-500">
              Mortgage Planner
            </p>
            <h2 className="text-2xl font-semibold text-white">
              Mortgage Planner
            </h2>
            <p className="text-sm text-gray-400">
              Enter your mortgage assumptions to understand the multi-year
              impact.
            </p>
          </header>

          <div className="space-y-6 rounded-2xl border border-white/10 bg-gray-950 p-5">
            <StepForm
              propertyCategory={propertyCategory}
              borrowerType={borrowerType}
              fixedRate={fixedRate}
              fixedYears={fixedYears}
              floatingRate={floatingRate}
              householdIncome={householdIncome}
              loanAmount={loanAmount}
              loanStartMonth={loanStartMonth}
              loanTermYears={loanTermYears}
              onBorrowerChange={(value) => updateInputs({ borrowerType: value })}
              onPropertyCategoryChange={setPropertyCategory}
              onFixedRateChange={(value) => updateInputs({ fixedRate: value })}
              onFixedYearsChange={(value) => updateInputs({ fixedYears: value })}
              onFloatingRateChange={(value) =>
                updateInputs({ floatingRate: value })
              }
              onHouseholdIncomeChange={(value) =>
                updateInputs({ householdIncome: value })
              }
              onLoanAmountChange={(value) =>
                updateInputs({ loanAmount: value })
              }
              onLoanStartMonthChange={(value) =>
                updateInputs({ loanStartMonth: value })
              }
              onLoanTermChange={(value) =>
                updateInputs({ loanTermYears: value })
              }
              onOtherDebtChange={(value) => updateInputs({ otherDebt: value })}
              otherDebt={otherDebt}
              monthlyPayment={monthlyPayment}
              msrRatio={msrRatio}
              storedIncome={storedMonthlyIncome}
              onUseStoredIncome={() => {
                if (storedMonthlyIncome) {
                  updateInputs({ householdIncome: storedMonthlyIncome });
                }
              }}
            />

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <div className="text-xs text-gray-400">
                {lastSavedAt
                  ? `Last saved ${formatDistanceToNow(new Date(lastSavedAt), {
                      addSuffix: true,
                    })}`
                  : "Draft not saved yet"}
              </div>
              <div className="flex gap-2">
                <button
                  className="rounded-full border border-white/15 px-4 py-2 text-sm text-gray-300 disabled:opacity-50"
                  disabled={isSavingDraft || !hasUnsavedChanges}
                  onClick={handleSaveDraft}
                  type="button"
                >
                  {isSavingDraft ? (
                    <span className="flex items-center gap-2 text-white">
                      <Loader2 className="h-4 w-4 animate-spin" /> Saving...
                    </span>
                  ) : (
                    "Save Draft"
                  )}
                </button>
                <button
                  className="rounded-full bg-emerald-500 px-5 py-2 text-sm font-semibold text-white transition hover:bg-emerald-400 disabled:opacity-50"
                  onClick={handleSubmit}
                  type="button"
                >
                  Generate Overview
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      {isComplete ? (
        <MortgageOverview
          loanAmount={loanAmount}
          loanEndDate={loanEndDate}
          monthlyPayment={monthlyPayment}
          msrRatio={msrRatio}
          loanTermYears={loanTermYears}
          amortizationData={amortizationData}
          onEdit={handleEdit}
          totalInterest={totalInterest}
          onApplyPlan={handleApplyPlan}
          canApply={Boolean(scenario.id) && !hasUnsavedChanges}
          isApplying={isApplyingPlan}
        />
      ) : null}
    </div>
  );
}

interface StepOneProps {
  loanAmount: number;
  loanStartMonth: string;
  loanTermYears: number;
  borrowerType: "single" | "couple";
  propertyCategory: "hdb" | "private";
  onLoanAmountChange: (value: number) => void;
  onLoanStartMonthChange: (value: string) => void;
  onLoanTermChange: (value: number) => void;
  onBorrowerChange: (value: "single" | "couple") => void;
  onPropertyCategoryChange: (value: "hdb" | "private") => void;
}

function StepOne({
  loanAmount,
  loanStartMonth,
  loanTermYears,
  borrowerType,
  propertyCategory,
  onLoanAmountChange,
  onLoanStartMonthChange,
  onLoanTermChange,
  onBorrowerChange,
  onPropertyCategoryChange,
}: StepOneProps) {
  return (
    <div className="space-y-6">
      <header>
        <h3 className="text-lg font-semibold text-white">Loan Basics</h3>
        <p className="text-sm text-gray-400">
          Tell us about your mortgage requirements.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-medium text-gray-300">
          Property Type
          <select
            className="mt-1 w-full rounded-2xl border border-white/15 bg-gray-900 px-4 py-2 text-white focus:border-blue-400 focus:outline-none"
            onChange={(event) =>
              onPropertyCategoryChange(event.target.value as "hdb" | "private")
            }
            value={propertyCategory}
          >
            <option value="hdb">HDB (BTO / Resale)</option>
            <option value="private">Private</option>
          </select>
        </label>
      </div>

      <div className="space-y-2">
        <label className="flex items-center justify-between text-sm font-medium text-gray-300">
          <span>Loan Amount</span>
          <span className="text-blue-300 font-semibold">
            {formatCurrency(loanAmount)}
          </span>
        </label>
        <input
          aria-label="Loan amount"
          className="w-full accent-blue-400"
          max={1_500_000}
          min={50_000}
          onChange={(event) =>
            onLoanAmountChange(Number(event.target.value) || 0)
          }
          step={10_000}
          type="range"
          value={loanAmount}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-medium text-gray-300">
          Loan Start Date
          <input
            className="mt-1 w-full rounded-2xl border border-white/15 bg-gray-900 px-4 py-2 text-white focus:border-blue-400 focus:outline-none"
            max="2035-12"
            min="2024-01"
            onChange={(event) => onLoanStartMonthChange(event.target.value)}
            type="month"
            value={loanStartMonth}
          />
        </label>

        <label className="text-sm font-medium text-gray-300">
          Loan Term (years)
          <input
            className="mt-1 w-full rounded-2xl border border-white/15 bg-gray-900 px-4 py-2 text-white focus:border-blue-400 focus:outline-none"
            min={5}
            max={35}
            onChange={(event) =>
              onLoanTermChange(Number(event.target.value) || loanTermYears)
            }
            type="number"
            value={loanTermYears}
          />
        </label>
      </div>

      <div>
        <p className="text-sm font-medium text-gray-300">Borrowers</p>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          {[
            {
              id: "single",
              label: "Single Borrower",
              helper: "I am servicing the mortgage alone",
            },
            {
              id: "couple",
              label: "Couple",
              helper: "I am servicing the loan with a partner or spouse",
            },
          ].map((option) => (
            <button
          className={`rounded-2xl border px-4 py-3 text-left transition ${
                borrowerType === option.id
                  ? "border-blue-500 bg-blue-500/10"
                  : "border-white/15 bg-white/5 hover:border-white/30"
              }`}
              key={option.id}
              onClick={() =>
                onBorrowerChange(option.id as "single" | "couple")
              }
              type="button"
            >
              <div className="flex items-center justify-between">
                <p className="font-semibold text-white">{option.label}</p>
                <span
                  className={`h-4 w-4 rounded-full border ${
                    borrowerType === option.id
                      ? "border-blue-400 bg-blue-400"
                      : "border-white/20"
                  }`}
                />
              </div>
              <p className="mt-1 text-sm text-gray-400">{option.helper}</p>
            </button>
          ))}
        </div>
      </div>

    </div>
  );
}

interface StepFormProps {
  propertyCategory: "hdb" | "private";
  loanAmount: number;
  loanStartMonth: string;
  loanTermYears: number;
  borrowerType: "single" | "couple";
  fixedYears: number;
  fixedRate: number;
  floatingRate: number;
  householdIncome: number;
  otherDebt: number;
  monthlyPayment: number;
  msrRatio: number;
  storedIncome: number | null;
  onUseStoredIncome: () => void;
  onLoanAmountChange: (value: number) => void;
  onLoanStartMonthChange: (value: string) => void;
  onLoanTermChange: (value: number) => void;
  onBorrowerChange: (value: "single" | "couple") => void;
  onPropertyCategoryChange: (value: "hdb" | "private") => void;
  onFixedYearsChange: (value: number) => void;
  onFixedRateChange: (value: number) => void;
  onFloatingRateChange: (value: number) => void;
  onHouseholdIncomeChange: (value: number) => void;
  onOtherDebtChange: (value: number) => void;
}

function StepForm({
  loanAmount,
  loanStartMonth,
  loanTermYears,
  borrowerType,
  propertyCategory,
  fixedYears,
  fixedRate,
  floatingRate,
  householdIncome,
  otherDebt,
  monthlyPayment,
  msrRatio,
  storedIncome,
  onUseStoredIncome,
  onLoanAmountChange,
  onLoanStartMonthChange,
  onLoanTermChange,
  onBorrowerChange,
  onPropertyCategoryChange,
  onFixedYearsChange,
  onFixedRateChange,
  onFloatingRateChange,
  onHouseholdIncomeChange,
  onOtherDebtChange,
}: StepFormProps) {
  return (
    <div className="space-y-6">
      <StepOne
        propertyCategory={propertyCategory}
        borrowerType={borrowerType}
        loanAmount={loanAmount}
        loanStartMonth={loanStartMonth}
        loanTermYears={loanTermYears}
        onBorrowerChange={onBorrowerChange}
        onPropertyCategoryChange={onPropertyCategoryChange}
        onLoanAmountChange={onLoanAmountChange}
        onLoanStartMonthChange={onLoanStartMonthChange}
        onLoanTermChange={onLoanTermChange}
      />
      <div className="border-t border-white/10" />
      <InterestSection
        fixedRate={fixedRate}
        fixedYears={fixedYears}
        floatingRate={floatingRate}
        onFixedRateChange={onFixedRateChange}
        onFixedYearsChange={onFixedYearsChange}
        onFloatingRateChange={onFloatingRateChange}
      />
      <div className="border-t border-white/10" />
      <IncomeSection
        householdIncome={householdIncome}
        monthlyPayment={monthlyPayment}
        msrRatio={msrRatio}
        onHouseholdIncomeChange={onHouseholdIncomeChange}
        onOtherDebtChange={onOtherDebtChange}
        otherDebt={otherDebt}
        storedIncome={storedIncome}
        onUseStoredIncome={onUseStoredIncome}
      />
    </div>
  );
}

interface MortgageOverviewProps {
  monthlyPayment: number;
  totalInterest: number;
  msrRatio: number;
  loanEndDate: string;
  onEdit: () => void;
  loanAmount: number;
  loanTermYears: number;
  amortizationData: MortgageAmortization;
  onApplyPlan: () => Promise<void> | void;
  canApply: boolean;
  isApplying: boolean;
}

function MortgageOverview({
  monthlyPayment,
  totalInterest,
  msrRatio,
  loanEndDate,
  onEdit,
  loanAmount,
  loanTermYears,
  amortizationData,
  onApplyPlan,
  canApply,
  isApplying,
}: MortgageOverviewProps) {
  const { height: viewportHeight } = useWindowSize();
  const chartHeight = useMemo(() => {
    const safeHeight = viewportHeight ?? 0;
    if (safeHeight === 0) {
      return MIN_CHART_HEIGHT_PX;
    }
    return Math.max(safeHeight * MIN_CHART_HEIGHT_RATIO, MIN_CHART_HEIGHT_PX);
  }, [viewportHeight]);
  const balanceYearTicks = amortizationData.balancePoints.map(
    (point) => point.yearIndex
  );
  const compositionYearTicks = amortizationData.composition.map(
    (point) => point.yearIndex
  );
  const firstBalanceTick = balanceYearTicks[0] ?? 1;
  const lastBalanceTick = balanceYearTicks[balanceYearTicks.length - 1] ?? 1;
  const firstCompositionTick = compositionYearTicks[0] ?? 1;
  const lastCompositionTick =
    compositionYearTicks[compositionYearTicks.length - 1] ?? 1;
  const balanceDomain: [number, number] = [
    Math.max(0, firstBalanceTick - 0.5),
    lastBalanceTick + 0.5,
  ];
  const compositionDomain: [number, number] = [
    Math.max(0, firstCompositionTick - 0.5),
    lastCompositionTick + 0.5,
  ];
  return (
    <section className="rounded-3xl border border-white/10 bg-gray-900 p-6 text-white shadow-xl">
      <div className="mb-6">
        <p className="text-xs uppercase tracking-[0.18em] text-gray-500">
          Mortgage Overview
        </p>
        <h3 className="text-2xl font-semibold text-white">
          Mortgage Overview
        </h3>
        <p className="text-sm text-gray-400">
          Your complete mortgage summary and projections.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {[
          {
            label: "Monthly Payment",
            value: formatCurrency(monthlyPayment),
            icon: PiggyBank,
          },
          {
            label: "Total Interest",
            value: formatCurrency(totalInterest),
            icon: TrendingDown,
          },
          {
            label: "MSR %",
            value: formatPercentage(msrRatio),
            helper: msrRatio <= 0.3
              ? "Below 30% threshold"
              : "Exceeds 30% threshold",
            icon: Percent,
          },
          {
            label: "Loan End Date",
            value: loanEndDate,
            icon: Calendar,
          },
        ].map((card) => (
          <div
            className="rounded-2xl border border-white/10 bg-black/30 p-4"
            key={card.label}
          >
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <card.icon className="h-4 w-4" />
              {card.label}
            </div>
            <p className="mt-2 text-2xl font-semibold text-white">
              {card.value}
            </p>
            {card.helper ? (
              <p
                className={`text-xs ${
                  msrRatio <= 0.3 ? "text-emerald-300" : "text-amber-300"
                }`}
              >
                {card.helper}
              </p>
            ) : null}
          </div>
        ))}
      </div>

      <div className="mt-6 space-y-4">
        {[
          {
            title: "Loan Balance Over Time",
            helper: `Loan balance chart: ${formatCurrency(
              loanAmount
            )} → $0`,
            hasData: amortizationData.balancePoints.length > 0,
            render: (height: number) => (
              <ResponsiveContainer width="100%" height={height}>
                <AreaChart
                  data={amortizationData.balancePoints}
                  margin={{ bottom: 32, left: 0, right: 0 }}
                >
                  <defs>
                    <linearGradient
                      id="loanBalanceGradient"
                      x1="0"
                      x2="0"
                      y1="0"
                      y2="1"
                    >
                      <stop offset="5%" stopColor="#60A5FA" stopOpacity={0.6} />
                      <stop
                        offset="95%"
                        stopColor="#60A5FA"
                        stopOpacity={0.05}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#1f2937" strokeDasharray="3 3" />
                  <XAxis
                    dataKey="yearIndex"
                    type="number"
                    domain={balanceDomain}
                    ticks={balanceYearTicks}
                    allowDecimals={false}
                    stroke="#9CA3AF"
                    fontSize={12}
                    tickMargin={10}
                    tickFormatter={(value) => `${value}`}
                    label={{
                      value: "Year",
                      position: "bottom",
                      offset: 0,
                      fill: "#9CA3AF",
                    }}
                  />
                  <YAxis
                    stroke="#9CA3AF"
                    fontSize={12}
                    tickFormatter={(value) =>
                      formatCurrency(value, { compact: true })
                    }
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#111827",
                      border: "1px solid rgba(255,255,255,0.1)",
                    }}
                    labelFormatter={(value) => `Year ${value}`}
                    formatter={(value: number) => formatCurrency(value as number)}
                  />
                  <Area
                    dataKey="balance"
                    type="monotone"
                    stroke="#3B82F6"
                    strokeWidth={3}
                    fill="url(#loanBalanceGradient)"
                    name="Remaining Balance"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ),
          },
          {
            title: "Interest vs Principal Payments",
            helper: "See how your payment composition changes each year.",
            hasData: amortizationData.composition.length > 0,
            render: (height: number) => (
              <ResponsiveContainer width="100%" height={height}>
                <BarChart
                  data={amortizationData.composition}
                  barCategoryGap="20%"
                  barGap={4}
                  margin={{ bottom: 36, left: 0, right: 0 }}
                >
                  <CartesianGrid stroke="#1f2937" strokeDasharray="3 3" />
                  <XAxis
                    dataKey="yearIndex"
                    type="number"
                    domain={compositionDomain}
                    ticks={compositionYearTicks}
                    allowDecimals={false}
                    stroke="#9CA3AF"
                    fontSize={11}
                    tickMargin={14}
                    tickFormatter={(value) => `${value}`}
                    label={{
                      value: "Year",
                      position: "bottom",
                      offset: 0,
                      fill: "#9CA3AF",
                    }}
                  />
                  <YAxis
                    stroke="#9CA3AF"
                    fontSize={12}
                    tickFormatter={(value) =>
                      formatCurrency(value, { compact: true })
                    }
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#111827",
                      border: "1px solid rgba(255,255,255,0.1)",
                    }}
                    labelFormatter={(value) => `Year ${value}`}
                    formatter={(value: number, name) => [
                      formatCurrency(value as number),
                      name === "interest" ? "Interest" : "Principal",
                    ]}
                  />
                  <Legend wrapperStyle={{ paddingTop: 12 }} />
                  <Bar
                    dataKey="interest"
                    stackId="payments"
                    fill="rgba(248, 113, 113, 0.8)"
                    stroke="#F87171"
                  />
                  <Bar
                    dataKey="principal"
                    stackId="payments"
                    fill="rgba(59, 130, 246, 0.7)"
                    stroke="#3B82F6"
                  />
                </BarChart>
              </ResponsiveContainer>
            ),
          },
        ].map((section) => (
          <div
            className="rounded-2xl border border-white/10 bg-black/30 p-4"
            key={section.title}
          >
            <p className="text-sm font-semibold text-white">{section.title}</p>
            <p className="text-xs text-gray-400">{section.helper}</p>
            <div
              className="mt-3 rounded-xl border border-white/10 bg-gray-950 p-3"
              style={{ minHeight: chartHeight }}
            >
              {section.hasData ? (
                section.render(chartHeight)
              ) : (
                <div
                  className="flex items-center justify-center text-xs text-gray-500"
                  style={{ minHeight: chartHeight }}
                >
                  Not enough payment history yet.
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 flex justify-end gap-3">
        <button
          className="rounded-full border border-white/20 px-4 py-2 text-sm text-gray-200"
          onClick={onEdit}
          type="button"
        >
          Adjust inputs
        </button>
        <button
          className="rounded-full bg-blue-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-400 disabled:opacity-50"
          disabled={!canApply || isApplying}
          onClick={onApplyPlan}
          type="button"
        >
          {isApplying ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Applying...
            </span>
          ) : (
            "Apply to Plan"
          )}
        </button>
      </div>
    </section>
  );
}
interface InterestSectionProps {
  fixedYears: number;
  fixedRate: number;
  floatingRate: number;
  onFixedYearsChange: (value: number) => void;
  onFixedRateChange: (value: number) => void;
  onFloatingRateChange: (value: number) => void;
}

function InterestSection({
  fixedYears,
  fixedRate,
  floatingRate,
  onFixedYearsChange,
  onFixedRateChange,
  onFloatingRateChange,
}: InterestSectionProps) {
  return (
    <div className="space-y-4">
      <header>
        <h3 className="text-lg font-semibold text-white">Interest Rates</h3>
        <p className="text-sm text-gray-400">
          Outline your lock-in period and expected floating rate.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        <label className="text-sm font-medium text-gray-300">
          Fixed Period (Years)
          <input
            className="mt-1 w-full rounded-2xl border border-white/15 bg-gray-900 px-4 py-2 text-white focus:border-blue-400 focus:outline-none"
            max={10}
            min={1}
            onChange={(event) =>
              onFixedYearsChange(Number(event.target.value) || 1)
            }
            type="number"
            value={fixedYears}
          />
        </label>
        <label className="text-sm font-medium text-gray-300">
          Fixed Rate (% p.a.)
          <input
            className="mt-1 w-full rounded-2xl border border-white/15 bg-gray-900 px-4 py-2 text-white focus:border-blue-400 focus:outline-none"
            max={6}
            min={1}
            onChange={(event) =>
              onFixedRateChange(Number(event.target.value) || 0)
            }
            step={0.1}
            type="number"
            value={fixedRate}
          />
        </label>
        <label className="text-sm font-medium text-gray-300">
          Floating Rate (% p.a.)
          <input
            className="mt-1 w-full rounded-2xl border border-white/15 bg-gray-900 px-4 py-2 text-white focus:border-blue-400 focus:outline-none"
            max={7}
            min={1}
            onChange={(event) =>
              onFloatingRateChange(Number(event.target.value) || 0)
            }
            step={0.1}
            type="number"
            value={floatingRate}
          />
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          {
            label: "Fixed Window",
            helper: "Bank committed period",
            value: `${fixedYears} years`,
          },
          {
            label: "Current Rate",
            helper: "Applied to amortisation",
            value: `${fixedRate.toFixed(2)}%`,
          },
          {
            label: "Next Expected Rate",
            helper: "Post lock-in assumption",
            value: `${floatingRate.toFixed(2)}%`,
          },
        ].map((card) => (
          <div
            className="rounded-2xl border border-white/10 bg-white/5 p-4"
            key={card.label}
          >
            <p className="text-xs uppercase text-gray-400">{card.label}</p>
            <p className="mt-2 text-xl font-semibold text-white">
              {card.value}
            </p>
            <p className="text-xs text-gray-400">{card.helper}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

interface IncomeSectionProps {
  householdIncome: number;
  otherDebt: number;
  monthlyPayment: number;
  msrRatio: number;
  storedIncome: number | null;
  onUseStoredIncome: () => void;
  onHouseholdIncomeChange: (value: number) => void;
  onOtherDebtChange: (value: number) => void;
}

function IncomeSection({
  householdIncome,
  otherDebt,
  monthlyPayment,
  msrRatio,
  storedIncome,
  onUseStoredIncome,
  onHouseholdIncomeChange,
  onOtherDebtChange,
}: IncomeSectionProps) {
  const msrPercent = formatPercentage(msrRatio);
  const withinLimit = msrRatio <= 0.3;

  return (
    <div className="space-y-4">
      <header>
        <h3 className="text-lg font-semibold text-white">Income & MSR</h3>
        <p className="text-sm text-gray-400">
          Stress-test your loan against the 30% MSR guideline.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-medium text-gray-300">
          <div className="flex items-center justify-between gap-3">
            <span>Monthly Household Income</span>
            {storedIncome ? (
              <button
                className="text-xs text-blue-300 hover:text-blue-200"
                onClick={onUseStoredIncome}
                type="button"
              >
                Use plan income ({formatCurrency(storedIncome)})
              </button>
            ) : null}
          </div>
          <input
            className="mt-1 w-full rounded-2xl border border-white/15 bg-gray-900 px-4 py-2 text-white focus:border-blue-400 focus:outline-none"
            min={2_000}
            onChange={(event) =>
              onHouseholdIncomeChange(Number(event.target.value) || 0)
            }
            step={500}
            type="number"
            value={householdIncome}
          />
          <p className="mt-1 text-xs text-gray-500">
            For couples, include both borrowers&apos; gross monthly income.
          </p>
        </label>
        <label className="text-sm font-medium text-gray-300">
          Other Monthly Debt Obligations
          <input
            className="mt-1 w-full rounded-2xl border border-white/15 bg-gray-900 px-4 py-2 text-white focus:border-blue-400 focus:outline-none"
            min={0}
            onChange={(event) =>
              onOtherDebtChange(Number(event.target.value) || 0)
            }
            step={100}
            type="number"
            value={otherDebt}
          />
        </label>
      </div>

      <div
        className={`rounded-2xl border px-4 py-4 ${
          withinLimit
            ? "border-emerald-400/40 bg-emerald-500/10"
            : "border-amber-400/40 bg-amber-500/10"
        }`}
      >
        <div className="flex items-center gap-3">
          <Percent className="h-5 w-5 text-white" />
          <div>
            <p className="text-xs uppercase tracking-wide text-white/70">
              Estimated MSR
            </p>
            <p className="text-2xl font-semibold text-white">{msrPercent}</p>
            <p className="text-xs text-white/70">
              {withinLimit
                ? "Below 30% threshold"
                : "Above 30% MSR — consider tweaking loan"}
            </p>
          </div>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-white/15 bg-black/30 p-3 text-sm">
            <p className="text-gray-400">Estimated Monthly Payment</p>
            <p className="text-white">{formatCurrency(monthlyPayment)}</p>
          </div>
          <div className="rounded-xl border border-white/15 bg-black/30 p-3 text-sm">
            <p className="text-gray-400">Household Income</p>
            <p className="text-white">{formatCurrency(householdIncome)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
