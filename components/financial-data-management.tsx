'use client';

import React, { useEffect, useState } from 'react';
import { Plus, SlidersHorizontal } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { financialClient } from '@/lib/financial/client';
import { FinancialFormModal } from './financial-form-modal';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useFinancialPlanningStore } from '@/features/financial-planning';

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

  // Query data from Go service
  const { data: assets = [], isLoading: assetsLoading } = useQuery({
    queryKey: ['assets'],
    queryFn: () => financialClient.assets.list(),
  });

  const { data: liabilities = [], isLoading: liabilitiesLoading } = useQuery({
    queryKey: ['liabilities'],
    queryFn: () => financialClient.liabilities.list(),
  });

  const { data: incomes = [], isLoading: incomesLoading } = useQuery({
    queryKey: ['incomes'],
    queryFn: () => financialClient.incomes.list(),
  });

  const { data: expenses = [], isLoading: expensesLoading } = useQuery({
    queryKey: ['expenses'],
    queryFn: () => financialClient.expenses.list(),
  });

  const formatIncomeItems = (): FinancialItem[] => {
    return incomes.map(income => ({
      id: income.id,
      name: income.source,
      subtitle: `${income.frequency} • ${income.category || 'Income'}`,
      amount: `$${income.amount.toLocaleString()}`,
      icon: '💼',
      color: 'bg-emerald-500'
    }));
  };

  const formatExpenseItems = (): FinancialItem[] => {
    return expenses.map(expense => ({
      id: expense.id,
      name: expense.payee,
      subtitle: `${expense.frequency} • ${expense.category || 'Expense'}`,
      amount: `$${expense.amount.toLocaleString()}`,
      icon: '💰',
      color: 'bg-orange-500'
    }));
  };

  const formatAssetItems = (): FinancialItem[] => {
    return assets.map(asset => ({
      id: asset.id,
      name: asset.name,
      subtitle: `${asset.category} • ${asset.annualGrowthRate}% growth`,
      amount: `$${asset.currentValue.toLocaleString()}`,
      icon: '📈',
      color: 'bg-blue-500'
    }));
  };

  const formatLiabilityItems = (): FinancialItem[] => {
    return liabilities.map(liability => ({
      id: liability.id,
      name: liability.name,
      subtitle: `${liability.category} • ${liability.interestRateApr}% APR`,
      amount: `$${liability.currentBalance.toLocaleString()}`,
      icon: '💳',
      color: 'bg-red-500'
    }));
  };

  const categories: CategoryConfig[] = [
    {
      title: 'Income',
      description: 'Every source of income you expect to have throughout your life',
      items: formatIncomeItems(),
      isLoading: incomesLoading,
      modalType: 'incomes'
    },
    {
      title: 'Expenses',
      description: 'All the known expenses likely to occur throughout your life',
      items: formatExpenseItems(),
      isLoading: expensesLoading,
      modalType: 'expenses'
    },
    {
      title: 'Assets',
      description: 'Everything you own that has monetary value',
      items: formatAssetItems(),
      isLoading: assetsLoading,
      modalType: 'assets',
      onOpenSettings: () => setShowGrowthSettings(true)
    },
    {
      title: 'Liabilities',
      description: 'All debts and financial obligations you owe',
      items: formatLiabilityItems(),
      isLoading: liabilitiesLoading,
      modalType: 'liabilities'
    }
  ];

  return (
    <div className="h-full w-full bg-gray-900 text-white p-6 overflow-auto">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-white mb-1">Financial Data</h2>
        <p className="text-gray-400 text-sm">Manage your income, expenses, assets, and liabilities</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {categories.map((category) => (
          <FinancialCard
            key={category.title}
            title={category.title}
            description={category.description}
            items={category.items}
            isLoading={category.isLoading}
            onAddItem={() => setActiveModal(category.modalType)}
            onEditItem={(id) => setActiveModal(`${category.modalType}-${id}`)}
            onOpenSettings={category.onOpenSettings}
          />
        ))}
      </div>

      {/* Modals */}
      {activeModal && (
        <FinancialFormModal
          type={activeModal}
          onClose={() => setActiveModal(null)}
        />
      )}

      <GrowthSettingsSheet
        open={showGrowthSettings}
        onOpenChange={setShowGrowthSettings}
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
}

function FinancialCard({
  title,
  description,
  items,
  isLoading,
  onAddItem,
  onEditItem,
  onOpenSettings,
}: FinancialCardProps) {
  const iconColor = title === 'Income' ? 'text-emerald-500'
                  : title === 'Expenses' ? 'text-orange-500'
                  : title === 'Assets' ? 'text-blue-500'
                  : 'text-red-500';

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700">
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center ${iconColor}`}>
              {title === 'Income' ? '💼' : title === 'Expenses' ? '💰' : title === 'Assets' ? '📈' : '💳'}
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
                      type="button"
                      onClick={onOpenSettings}
                      className="w-8 h-8 rounded-full border border-gray-700 text-gray-200 hover:bg-gray-700 transition-colors flex items-center justify-center"
                    >
                      <SlidersHorizontal className="w-4 h-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent className="text-xs">
                    Adjust global growth rate
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            <button
              onClick={onAddItem}
              className="w-8 h-8 rounded-full bg-emerald-500 hover:bg-emerald-600 flex items-center justify-center transition-colors"
            >
              <Plus className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>
      </div>

      {/* Items */}
      <div className="p-4">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-700 rounded-full"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-gray-700 rounded w-1/3 mb-2"></div>
                    <div className="h-3 bg-gray-700 rounded w-1/2"></div>
                  </div>
                  <div className="h-4 bg-gray-700 rounded w-20"></div>
                </div>
              </div>
            ))}
          </div>
        ) : items.length > 0 ? (
          <div className="space-y-3">
            {items.map((item) => (
              <div
                key={item.id}
                onClick={() => onEditItem(item.id)}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-700 cursor-pointer transition-colors"
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${item.color}`}>
                  <span className="text-white text-lg">{item.icon}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-white truncate">{item.name}</div>
                  <div className="text-gray-400 text-sm truncate">{item.subtitle}</div>
                </div>
                <div className="text-white font-semibold">{item.amount}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <p className="text-sm">No {title.toLowerCase()} added yet</p>
            <p className="text-xs mt-1">Click the + button to add your first entry</p>
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

  const [value, setValue] = useState(() => (averageReturnRate * 100).toFixed(1));
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
      setError('Please enter a percentage.');
      return;
    }

    const percent = Number(value);
    if (!Number.isFinite(percent)) {
      setError('Enter a valid number.');
      return;
    }

    if (percent < 0 || percent > 25) {
      setError('Choose a value between 0% and 25%.');
      return;
    }

    updateProjectionSettings({ averageReturnRate: percent / 100 });
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-sm bg-gray-900 text-white border-l border-gray-800">
        <SheetHeader>
          <SheetTitle>Global asset assumptions</SheetTitle>
          <SheetDescription className="text-gray-400">
            This percentage is used when projecting assets that do not include their own growth rate.
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="growth-rate" className="text-gray-200">
              Average annual return (%)
            </Label>
            <Input
              id="growth-rate"
              type="number"
              min="0"
              max="25"
              step="0.1"
              value={value}
              onChange={(event) => {
                setValue(event.target.value);
                setError(null);
              }}
              className="bg-gray-800 border-gray-700 text-white"
            />
            <p className="text-xs text-gray-400">
              Currently applied as {(averageReturnRate * 100).toFixed(1)}% in forecasts.
            </p>
            {error && <p className="text-xs text-red-400">{error}</p>}
          </div>

          <button
            type="submit"
            className="w-full rounded-md bg-emerald-500 px-4 py-2 font-medium text-white hover:bg-emerald-600 transition-colors"
          >
            Save
          </button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
