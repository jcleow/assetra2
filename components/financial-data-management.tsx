"use client";

import { useQuery } from "@tanstack/react-query";
import { Plus, SlidersHorizontal } from "lucide-react";
import type React from "react";
import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useFinancialPlanningStore } from "@/features/financial-planning";
import { financialClient } from "@/lib/financial/client";
import { FinancialFormModal } from "./financial-form-modal";
import { CPFBalanceForm } from "./cpf-balance-form";

interface FinancialItem {
  id: string;
  name: string;
  subtitle: string;
  amount: string;
  icon: string;
  color: string;
}

interface CategoryConfig {
  title: string;
  description: string;
  items: FinancialItem[];
  isLoading: boolean;
  modalType: string;
  onOpenSettings?: () => void;
}

export function FinancialDataManagement() {
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [showGrowthSettings, setShowGrowthSettings] = useState(false);
  const [showCPFForm, setShowCPFForm] = useState(false);

  // Query data from Go service
  const { data: assets = [], isLoading: assetsLoading } = useQuery({
    queryKey: ["assets"],
    queryFn: () => financialClient.assets.list(),
  });

  const { data: liabilities = [], isLoading: liabilitiesLoading } = useQuery({
    queryKey: ["liabilities"],
    queryFn: () => financialClient.liabilities.list(),
  });

  const { data: incomes = [], isLoading: incomesLoading } = useQuery({
    queryKey: ["incomes"],
    queryFn: () => financialClient.incomes.list(),
  });

  const { data: expenses = [], isLoading: expensesLoading } = useQuery({
    queryKey: ["expenses"],
    queryFn: () => financialClient.expenses.list(),
  });

  const formatIncomeItems = (): FinancialItem[] => {
    return incomes.map((income) => ({
      id: income.id,
      name: income.source,
      subtitle: `${income.frequency} • ${income.category || "Income"}`,
      amount: `$${income.amount.toLocaleString()}`,
      icon: income.source.includes("CPF") ? "🏦" : "💼",
      color: income.source.includes("CPF") ? "bg-indigo-500" : "bg-emerald-500",
    }));
  };

  const formatExpenseItems = (): FinancialItem[] => {
    return expenses.map((expense) => ({
      id: expense.id,
      name: expense.payee,
      subtitle: `${expense.frequency} • ${expense.category || "Expense"}`,
      amount: `$${expense.amount.toLocaleString()}`,
      icon: expense.payee.includes("CPF") ? "🏦" : "💰",
      color: expense.payee.includes("CPF") ? "bg-indigo-500" : "bg-orange-500",
    }));
  };

  const formatAssetItems = (): FinancialItem[] => {
    return assets.map((asset) => ({
      id: asset.id,
      name: asset.name,
      subtitle: `${asset.category} • ${(asset.annualGrowthRate * 100).toFixed(1)}% growth`,
      amount: `$${asset.currentValue.toLocaleString()}`,
      icon: asset.name.includes("CPF") ? "🏦" : "📈",
      color: asset.name.includes("CPF") ? "bg-indigo-500" : "bg-blue-500",
    }));
  };

  const formatLiabilityItems = (): FinancialItem[] => {
    return liabilities.map((liability) => ({
      id: liability.id,
      name: liability.name,
      subtitle: `${liability.category} • ${liability.interestRateApr}% APR`,
      amount: `$${liability.currentBalance.toLocaleString()}`,
      icon: "💳",
      color: "bg-red-500",
    }));
  };

  // Calculate totals
  const totalAssets = assets.reduce((sum, asset) => sum + asset.currentValue, 0);
  const totalLiabilities = liabilities.reduce((sum, liability) => sum + liability.currentBalance, 0);
  const netWorth = totalAssets - totalLiabilities;

  const totalIncome = incomes.reduce((sum, income) => sum + income.amount, 0);
  const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const savings = totalIncome - totalExpenses;

  // Check if CPF assets exist
  const hasCPFAssets = assets.some(asset =>
    asset.name.includes("CPF") || asset.category === "retirement"
  );

  const leftColumnCategories: CategoryConfig[] = [
    {
      title: "Assets",
      description: "",
      items: formatAssetItems(),
      isLoading: assetsLoading,
      modalType: "assets",
      onOpenSettings: () => setShowGrowthSettings(true),
    },
    {
      title: "Liabilities",
      description: "All debts and financial obligations you owe",
      items: formatLiabilityItems(),
      isLoading: liabilitiesLoading,
      modalType: "liabilities",
    },
  ];

  const rightColumnCategories: CategoryConfig[] = [
    {
      title: "Income",
      description:
        "",
      items: formatIncomeItems(),
      isLoading: incomesLoading,
      modalType: "incomes",
    },
    {
      title: "Expenses",
      description:
        "",
      items: formatExpenseItems(),
      isLoading: expensesLoading,
      modalType: "expenses",
    },
  ];

  return (
    <div className="h-full w-full overflow-auto bg-gray-900 p-6 text-white">
      <div className="mb-6">
        <h2 className="mb-1 font-semibold text-white text-xl">
          Financial Data
        </h2>
        <p className="text-gray-400 text-sm">
          Manage your income, expenses, assets, and liabilities
        </p>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Left Column - Assets & Liabilities */}
        <div className="flex flex-1 flex-col space-y-6">
          {leftColumnCategories.map((category) => (
            <FinancialCard
              description={category.description}
              isLoading={category.isLoading}
              items={category.items}
              key={category.title}
              onAddItem={() => setActiveModal(category.modalType)}
              onEditItem={(id) => setActiveModal(`${category.modalType}-${id}`)}
              onOpenSettings={category.onOpenSettings}
              title={category.title}
              showCPFButton={category.title === "Assets" && !hasCPFAssets}
              onAddCPF={() => setShowCPFForm(true)}
            />
          ))}

          {/* Net Worth Summary */}
          <div className="mt-auto rounded-lg border border-gray-700 bg-gray-800 p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-white">Net Worth</h3>
                <p className="text-gray-400 text-sm">Assets minus liabilities</p>
              </div>
              <div className={`font-bold text-lg ${netWorth >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                ${netWorth.toLocaleString()}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Income & Expenses */}
        <div className="flex flex-1 flex-col space-y-6">
          {rightColumnCategories.map((category) => (
            <FinancialCard
              description={category.description}
              isLoading={category.isLoading}
              items={category.items}
              key={category.title}
              onAddItem={() => setActiveModal(category.modalType)}
              onEditItem={(id) => setActiveModal(`${category.modalType}-${id}`)}
              onOpenSettings={category.onOpenSettings}
              title={category.title}
              showCPFButton={false}
            />
          ))}

          {/* Savings Summary */}
          <div className="mt-auto rounded-lg border border-gray-700 bg-gray-800 p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-white">Savings</h3>
                <p className="text-gray-400 text-sm">Income minus expenses</p>
              </div>
              <div className={`font-bold text-lg ${savings >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                ${savings.toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {activeModal && (
        <FinancialFormModal
          onClose={() => setActiveModal(null)}
          type={activeModal}
        />
      )}

      {showCPFForm && (
        <CPFBalanceForm onClose={() => setShowCPFForm(false)} />
      )}

      <GrowthSettingsSheet
        onOpenChange={setShowGrowthSettings}
        open={showGrowthSettings}
      />
    </div>
  );
}

interface FinancialCardProps {
  title: string;
  description: string;
  items: FinancialItem[];
  isLoading: boolean;
  onAddItem: () => void;
  onEditItem: (id: string) => void;
  onOpenSettings?: () => void;
  onAddCPF?: () => void;
  showCPFButton?: boolean;
}

function FinancialCard({
  title,
  description,
  items,
  isLoading,
  onAddItem,
  onEditItem,
  onOpenSettings,
  onAddCPF,
  showCPFButton,
}: FinancialCardProps) {
  const iconColor =
    title === "Income"
      ? "text-emerald-500"
      : title === "Expenses"
        ? "text-orange-500"
        : title === "Assets"
          ? "text-blue-500"
          : "text-red-500";

  return (
    <div className="flex flex-1 flex-col rounded-lg border border-gray-700 bg-gray-800">
      {/* Header */}
      <div className="border-gray-700 border-b p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full bg-gray-700 ${iconColor}`}
            >
              {title === "Income"
                ? "💼"
                : title === "Expenses"
                  ? "💰"
                  : title === "Assets"
                    ? "📈"
                    : "💳"}
            </div>
            <div>
              <h3 className="font-semibold text-white">{title}</h3>
              <p className="text-gray-400 text-sm">{description}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {onOpenSettings && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-700 text-gray-200 transition-colors hover:bg-gray-700"
                      onClick={onOpenSettings}
                      type="button"
                    >
                      <SlidersHorizontal className="h-4 w-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent className="text-xs">
                    Adjust global growth rate
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            {showCPFButton && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500 text-white transition-colors hover:bg-blue-600"
                      onClick={onAddCPF}
                      type="button"
                    >
                      🏦
                    </button>
                  </TooltipTrigger>
                  <TooltipContent className="text-xs">
                    Add CPF Balances
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            <button
              className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500 transition-colors hover:bg-emerald-600"
              onClick={onAddItem}
            >
              <Plus className="h-4 w-4 text-white" />
            </button>
          </div>
        </div>
      </div>

      {/* Items */}
      <div className="flex-1 p-4">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div className="animate-pulse" key={i}>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-gray-700" />
                  <div className="flex-1">
                    <div className="mb-2 h-4 w-1/3 rounded bg-gray-700" />
                    <div className="h-3 w-1/2 rounded bg-gray-700" />
                  </div>
                  <div className="h-4 w-20 rounded bg-gray-700" />
                </div>
              </div>
            ))}
          </div>
        ) : items.length > 0 ? (
          <div className="space-y-3">
            {items.map((item) => (
              <div
                className="flex cursor-pointer items-center gap-3 rounded-lg p-3 transition-colors hover:bg-gray-700"
                key={item.id}
                onClick={() => onEditItem(item.id)}
              >
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-full ${item.color}`}
                >
                  <span className="text-lg text-white">{item.icon}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium text-white">
                    {item.name}
                  </div>
                  <div className="truncate text-gray-400 text-sm">
                    {item.subtitle}
                  </div>
                </div>
                <div className="font-semibold text-white">{item.amount}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-8 text-center text-gray-500">
            <p className="text-sm">No {title.toLowerCase()} added yet</p>
            <p className="mt-1 text-xs">
              Click the + button to add your first entry
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

interface GrowthSettingsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function GrowthSettingsSheet({ open, onOpenChange }: GrowthSettingsSheetProps) {
  const averageReturnRate = useFinancialPlanningStore(
    (state) => state.projectionSettings.averageReturnRate
  );
  const updateProjectionSettings = useFinancialPlanningStore(
    (state) => state.updateProjectionSettings
  );

  const [value, setValue] = useState(() =>
    (averageReturnRate * 100).toFixed(1)
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setValue((averageReturnRate * 100).toFixed(1));
      setError(null);
    }
  }, [averageReturnRate, open]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!value.trim()) {
      setError("Please enter a percentage.");
      return;
    }

    const percent = Number(value);
    if (!Number.isFinite(percent)) {
      setError("Enter a valid number.");
      return;
    }

    if (percent < 0 || percent > 25) {
      setError("Choose a value between 0% and 25%.");
      return;
    }

    updateProjectionSettings({ averageReturnRate: percent / 100 });
    onOpenChange(false);
  };

  return (
    <Sheet onOpenChange={onOpenChange} open={open}>
      <SheetContent
        className="w-full border-gray-800 border-l bg-gray-900 text-white sm:max-w-sm"
        side="right"
      >
        <SheetHeader>
          <SheetTitle>Global asset assumptions</SheetTitle>
          <SheetDescription className="text-gray-400">
            This percentage is used when projecting assets that do not include
            their own growth rate.
          </SheetDescription>
        </SheetHeader>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label className="text-gray-200" htmlFor="growth-rate">
              Average annual return (%)
            </Label>
            <Input
              className="border-gray-700 bg-gray-800 text-white"
              id="growth-rate"
              max="25"
              min="0"
              onChange={(event) => {
                setValue(event.target.value);
                setError(null);
              }}
              step="0.1"
              type="number"
              value={value}
            />
            <p className="text-gray-400 text-xs">
              Currently applied as {(averageReturnRate * 100).toFixed(1)}% in
              forecasts.
            </p>
            {error && <p className="text-red-400 text-xs">{error}</p>}
          </div>

          <button
            className="w-full rounded-md bg-emerald-500 px-4 py-2 font-medium text-white transition-colors hover:bg-emerald-600"
            type="submit"
          >
            Save
          </button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
