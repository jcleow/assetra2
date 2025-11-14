"use client";

import {
  Calendar,
  Percent,
  PiggyBank,
  TrendingDown,
} from "lucide-react";
import { useMemo, useState } from "react";
import {
  formatCurrency,
  formatPercentage,
  useFinancialPlanningStore,
} from "@/features/financial-planning";
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

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

export function MortgageWizard() {
  const [isComplete, setIsComplete] = useState(false);
  const storedMonthlyIncome = useFinancialPlanningStore(
    (state) => state.financialPlan?.summary.monthlyIncome ?? null
  );

  const [loanAmount, setLoanAmount] = useState(750_000);
  const [loanTermYears, setLoanTermYears] = useState(25);
  const [borrowerType, setBorrowerType] = useState<"single" | "couple">(
    "single"
  );
  const [propertyCategory, setPropertyCategory] = useState<"hdb" | "private">(
    "hdb"
  );
  const [loanStartMonth, setLoanStartMonth] = useState("2025-11");

  const [fixedYears, setFixedYears] = useState(5);
  const [fixedRate, setFixedRate] = useState(2.6);
  const [floatingRate, setFloatingRate] = useState(4.1);

  const [householdIncome, setHouseholdIncome] = useState(10_500);
  const [otherDebt, setOtherDebt] = useState(0);

  const totalMonths = loanTermYears * 12;
  const monthlyRate = (fixedRate / 100) / 12;

  const monthlyPayment = useMemo(() => {
    if (monthlyRate === 0) {
      return loanAmount / totalMonths;
    }
    const numerator = loanAmount * monthlyRate;
    const denominator = 1 - Math.pow(1 + monthlyRate, -totalMonths);
    return numerator / denominator;
  }, [loanAmount, monthlyRate, totalMonths]);

  const totalInterest = monthlyPayment * totalMonths - loanAmount;
  const msrRatio = householdIncome
    ? clamp(monthlyPayment / householdIncome, 0, 1.5)
    : 0;

  const loanStartYear = useMemo(() => {
    const [yearPart] = loanStartMonth.split("-");
    const parsed = Number(yearPart);
    return Number.isFinite(parsed) ? parsed : new Date().getFullYear();
  }, [loanStartMonth]);

  const amortizationData = useMemo(
    () =>
      buildAmortizationData({
        loanAmount,
        loanTermYears,
        monthlyPayment,
        monthlyRate,
        totalMonths,
        loanStartYear,
      }),
    [
      loanAmount,
      loanTermYears,
      monthlyPayment,
      monthlyRate,
      totalMonths,
      loanStartYear,
    ]
  );

  const loanEndDate = useMemo(() => {
    if (!loanStartMonth) {
      return "—";
    }
    const [year, month] = loanStartMonth.split("-").map(Number);
    if (!year || !month) return "—";
    const end = new Date(year, month - 1 + loanTermYears * 12, 1);
    return end.toLocaleString("en-SG", { month: "short", year: "numeric" });
  }, [loanStartMonth, loanTermYears]);

  const handleSubmit = () => {
    setIsComplete(true);
  };

  const handleEdit = () => {
    setIsComplete(false);
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
              onBorrowerChange={setBorrowerType}
              onPropertyCategoryChange={setPropertyCategory}
              onFixedRateChange={setFixedRate}
              onFixedYearsChange={setFixedYears}
              onFloatingRateChange={setFloatingRate}
              onHouseholdIncomeChange={setHouseholdIncome}
              onLoanAmountChange={setLoanAmount}
              onLoanStartMonthChange={setLoanStartMonth}
              onLoanTermChange={setLoanTermYears}
              onOtherDebtChange={setOtherDebt}
              otherDebt={otherDebt}
              monthlyPayment={monthlyPayment}
              msrRatio={msrRatio}
              storedIncome={storedMonthlyIncome}
              onUseStoredIncome={() => {
                if (storedMonthlyIncome) {
                  setHouseholdIncome(storedMonthlyIncome);
                }
              }}
            />

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <button
                className="rounded-full border border-white/15 px-4 py-2 text-sm text-gray-300"
                disabled
                title="Saving drafts requires backend integration"
                type="button"
              >
                Save for Later
              </button>
              <button
                className="rounded-full bg-blue-500 px-5 py-2 text-sm font-semibold text-white transition hover:bg-blue-400 disabled:opacity-50"
                onClick={handleSubmit}
                type="button"
              >
                Generate Overview
              </button>
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
        <h3 className="text-lg font-semibold text-white">Step 1 — Loan Basics</h3>
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
  amortizationData: AmortizationData;
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
}: MortgageOverviewProps) {
  return (
    <section className="rounded-3xl border border-white/10 bg-gray-900 p-6 text-white shadow-xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
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
        <button
          className="rounded-full border border-white/20 px-4 py-2 text-sm text-gray-200"
          onClick={onEdit}
          type="button"
        >
          Adjust inputs
        </button>
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
            render: () => (
              <ResponsiveContainer height={260}>
                <AreaChart data={amortizationData.balancePoints}>
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
                    dataKey="label"
                    stroke="#9CA3AF"
                    fontSize={12}
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
            render: () => (
              <ResponsiveContainer height={260}>
                <BarChart
                  data={amortizationData.composition}
                  barCategoryGap="20%"
                  barGap={4}
                >
                  <CartesianGrid stroke="#1f2937" strokeDasharray="3 3" />
                  <XAxis
                    dataKey="label"
                    stroke="#9CA3AF"
                    fontSize={11}
                    interval={0}
                    angle={-45}
                    textAnchor="end"
                    height={70}
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
                    formatter={(value: number, name) => [
                      formatCurrency(value as number),
                      name === "interest" ? "Interest" : "Principal",
                    ]}
                  />
                  <Legend />
                  <Bar dataKey="interest" stackId="payments" fill="#F97316" />
                  <Bar dataKey="principal" stackId="payments" fill="#34D399" />
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
            <div className="mt-3 h-56 rounded-xl border border-white/10 bg-gray-950 p-3">
              {section.hasData ? (
                section.render()
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-gray-500">
                  Not enough payment history yet.
                </div>
              )}
            </div>
          </div>
        ))}
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

interface AmortizationPoint {
  label: string;
  balance: number;
  year: number;
}

interface CompositionPoint {
  label: string;
  interest: number;
  principal: number;
  year: number;
}

interface AmortizationData {
  balancePoints: AmortizationPoint[];
  composition: CompositionPoint[];
}

interface BuildAmortizationArgs {
  loanAmount: number;
  monthlyPayment: number;
  monthlyRate: number;
  loanTermYears: number;
  totalMonths: number;
  loanStartYear: number;
}

function buildAmortizationData({
  loanAmount,
  monthlyPayment,
  monthlyRate,
  loanTermYears,
  totalMonths,
  loanStartYear,
}: BuildAmortizationArgs): AmortizationData {
  if (!Number.isFinite(monthlyPayment) || monthlyPayment <= 0) {
    return { balancePoints: [], composition: [] };
  }

  const balancePoints: AmortizationPoint[] = [];
  const composition: CompositionPoint[] = [];
  let remaining = loanAmount;
  let interestAcc = 0;
  let principalAcc = 0;

  for (let month = 1; month <= totalMonths; month++) {
    const interest = monthlyRate > 0 ? remaining * monthlyRate : 0;
    let principal = monthlyPayment - interest;
    if (principal < 0) {
      principal = 0;
    }
    if (principal > remaining) {
      principal = remaining;
    }
    remaining = Math.max(remaining - principal, 0);
    interestAcc += interest;
    principalAcc += principal;

    const atYearBoundary = month % 12 === 0 || month === totalMonths;
    if (atYearBoundary) {
      const yearIndex = Math.ceil(month / 12);
      balancePoints.push({
        label: `Year ${yearIndex}`,
        balance: Math.round(remaining),
        year: loanStartYear + yearIndex - 1,
      });
      composition.push({
        label: `Year ${yearIndex}`,
        interest: Math.round(interestAcc),
        principal: Math.round(principalAcc),
        year: loanStartYear + yearIndex - 1,
      });
      interestAcc = 0;
      principalAcc = 0;
    }

    if (remaining <= 0) {
      break;
    }
  }

  if (balancePoints.length === 0) {
    balancePoints.push({
      label: "Year 1",
      balance: Math.round(remaining),
      year: loanStartYear,
    });
  }

  if (composition.length === 0) {
    composition.push({
      label: "Year 1",
      interest: Math.round(loanAmount * monthlyRate * 12),
      principal: Math.round(monthlyPayment * 12),
      year: loanStartYear,
    });
  }

  return { balancePoints, composition };
}
