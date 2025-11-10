'use client';

import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Trash2 } from 'lucide-react';
import { financialClient } from '@/lib/financial/client';
import { useFinancialPlanningStore } from '@/features/financial-planning';
import type {
  AssetCreatePayload,
  LiabilityCreatePayload,
  IncomeCreatePayload,
  ExpenseCreatePayload,
  Asset,
  Liability,
  Income,
  Expense
} from '@/lib/financial/types';

interface FinancialFormModalProps {
  type: string;
  onClose: () => void;
}

export function FinancialFormModal({ type, onClose }: FinancialFormModalProps) {
  console.log('FinancialFormModal opened with type:', type);

  const isEdit = type.includes('-');
  const category = isEdit ? type.split('-')[0] : type;
  const itemId = isEdit ? type.split('-').slice(1).join('-') : null;

  console.log('Parsed:', { isEdit, category, itemId });

  // Normalize category names (handle both singular and plural)
  const normalizedCategory = (category === 'income' || category === 'incomes') ? 'incomes' :
                           (category === 'expense' || category === 'expenses') ? 'expenses' :
                           (category === 'asset' || category === 'assets') ? 'assets' :
                           (category === 'liability' || category === 'liabilities') ? 'liabilities' : category;

  console.log('Normalized category:', normalizedCategory);

  const queryClient = useQueryClient();
  const invalidateFinancialData = useFinancialPlanningStore((state) => state.invalidateFinancialData);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    amount: '',
    frequency: 'monthly',
    category: '',
    annualGrowthRate: '7.0',
    interestRateApr: '4.5',
    minimumPayment: ''
  });

  // Load existing data for edit mode
  useEffect(() => {
    if (isEdit && itemId) {
      const loadItem = async () => {
        try {
          let data: Asset | Liability | Income | Expense;

          switch (normalizedCategory) {
            case 'assets':
              data = await financialClient.assets.get(itemId);
              setFormData({
                name: data.name,
                amount: data.currentValue.toString(),
                category: data.category,
                annualGrowthRate: (data.annualGrowthRate * 100).toString(),
                frequency: 'monthly',
                interestRateApr: '4.5',
                minimumPayment: ''
              });
              break;
            case 'liabilities':
              data = await financialClient.liabilities.get(itemId);
              setFormData({
                name: data.name,
                amount: data.currentBalance.toString(),
                category: data.category,
                interestRateApr: (data.interestRateApr * 100).toString(),
                minimumPayment: data.minimumPayment.toString(),
                frequency: 'monthly',
                annualGrowthRate: '7.0'
              });
              break;
            case 'incomes':
              data = await financialClient.incomes.get(itemId);
              setFormData({
                name: data.source,
                amount: data.amount.toString(),
                frequency: data.frequency,
                category: data.category,
                annualGrowthRate: '7.0',
                interestRateApr: '4.5',
                minimumPayment: ''
              });
              break;
            case 'expenses':
              data = await financialClient.expenses.get(itemId);
              setFormData({
                name: data.payee,
                amount: data.amount.toString(),
                frequency: data.frequency,
                category: data.category,
                annualGrowthRate: '7.0',
                interestRateApr: '4.5',
                minimumPayment: ''
              });
              break;
          }
        } catch (error) {
          console.error('Failed to load item for editing:', error);
        }
      };

      loadItem();
    }
  }, [isEdit, itemId, category]);

  // Mutations for CRUD operations
  const createAssetMutation = useMutation({
    mutationFn: (data: AssetCreatePayload) => financialClient.assets.create(data),
    onSuccess: () => {
      console.log('Asset created successfully');
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      invalidateFinancialData();
      onClose();
    },
    onError: (error) => {
      console.error('Failed to create asset:', error);
      alert('Failed to create asset. Please try again.');
    },
  });

  const updateAssetMutation = useMutation({
    mutationFn: (data: { id: string } & AssetCreatePayload) => financialClient.assets.update(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      invalidateFinancialData();
      onClose();
    },
  });

  const createLiabilityMutation = useMutation({
    mutationFn: (data: LiabilityCreatePayload) => financialClient.liabilities.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['liabilities'] });
      invalidateFinancialData();
      onClose();
    },
  });

  const updateLiabilityMutation = useMutation({
    mutationFn: (data: { id: string } & LiabilityCreatePayload) => financialClient.liabilities.update(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['liabilities'] });
      invalidateFinancialData();
      onClose();
    },
  });

  const createIncomeMutation = useMutation({
    mutationFn: (data: IncomeCreatePayload) => financialClient.incomes.create(data),
    onSuccess: () => {
      console.log('Income created successfully');
      queryClient.invalidateQueries({ queryKey: ['incomes'] });
      invalidateFinancialData();
      onClose();
    },
    onError: (error) => {
      console.error('Failed to create income:', error);
      alert('Failed to create income. Please try again.');
    },
  });

  const updateIncomeMutation = useMutation({
    mutationFn: (data: { id: string } & IncomeCreatePayload) => financialClient.incomes.update(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incomes'] });
      invalidateFinancialData();
      onClose();
    },
  });

  const createExpenseMutation = useMutation({
    mutationFn: (data: ExpenseCreatePayload) => financialClient.expenses.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      invalidateFinancialData();
      onClose();
    },
  });

  // Delete mutations
  const deleteAssetMutation = useMutation({
    mutationFn: (id: string) => financialClient.assets.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      invalidateFinancialData();
      onClose();
    },
  });

  const deleteLiabilityMutation = useMutation({
    mutationFn: (id: string) => financialClient.liabilities.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['liabilities'] });
      invalidateFinancialData();
      onClose();
    },
  });

  const deleteIncomeMutation = useMutation({
    mutationFn: (id: string) => financialClient.incomes.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incomes'] });
      invalidateFinancialData();
      onClose();
    },
  });

  const deleteExpenseMutation = useMutation({
    mutationFn: (id: string) => financialClient.expenses.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      invalidateFinancialData();
      onClose();
    },
  });

  const updateExpenseMutation = useMutation({
    mutationFn: (data: { id: string } & ExpenseCreatePayload) => financialClient.expenses.update(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      invalidateFinancialData();
      onClose();
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    console.log('Form submitted with data:', formData);

    if (!formData.name.trim() || !formData.amount.trim()) {
      alert('Please fill in all required fields');
      return;
    }

    const baseData = {
      name: formData.name.trim(),
      amount: parseFloat(formData.amount) || 0,
      category: formData.category.trim() || 'other',
    };

    console.log('Processed base data:', baseData);

    try {
      switch (normalizedCategory) {
        case 'assets':
          const assetData = {
            name: baseData.name,
            category: baseData.category,
            currentValue: baseData.amount,
            annualGrowthRate: parseFloat(formData.annualGrowthRate) / 100,
          };

          if (isEdit && itemId) {
            updateAssetMutation.mutate({ id: itemId, ...assetData });
          } else {
            createAssetMutation.mutate(assetData);
          }
          break;

        case 'liabilities':
          const liabilityData = {
            name: baseData.name,
            category: baseData.category,
            currentBalance: baseData.amount,
            interestRateApr: parseFloat(formData.interestRateApr) / 100,
            minimumPayment: parseFloat(formData.minimumPayment) || 0,
          };

          if (isEdit && itemId) {
            updateLiabilityMutation.mutate({ id: itemId, ...liabilityData });
          } else {
            createLiabilityMutation.mutate(liabilityData);
          }
          break;

        case 'incomes':
          const incomeData = {
            source: baseData.name,
            amount: baseData.amount,
            frequency: formData.frequency as any,
            startDate: new Date().toISOString(),
            category: baseData.category,
          };

          console.log('Creating income with data:', incomeData);

          if (isEdit && itemId) {
            updateIncomeMutation.mutate({ id: itemId, ...incomeData });
          } else {
            createIncomeMutation.mutate(incomeData);
          }
          break;

        case 'expenses':
          const expenseData = {
            payee: baseData.name,
            amount: baseData.amount,
            frequency: formData.frequency as any,
            category: baseData.category,
          };

          if (isEdit && itemId) {
            updateExpenseMutation.mutate({ id: itemId, ...expenseData });
          } else {
            createExpenseMutation.mutate(expenseData);
          }
          break;
      }
    } catch (error) {
      console.error('Form submission error:', error);
    }
  };

  const handleDelete = async () => {
    if (!isEdit || !itemId) return;

    if (!confirm('Are you sure you want to delete this item?')) {
      return;
    }

    try {
      switch (normalizedCategory) {
        case 'assets':
          deleteAssetMutation.mutate(itemId);
          break;
        case 'liabilities':
          deleteLiabilityMutation.mutate(itemId);
          break;
        case 'incomes':
          deleteIncomeMutation.mutate(itemId);
          break;
        case 'expenses':
          deleteExpenseMutation.mutate(itemId);
          break;
      }
    } catch (error) {
      console.error('Delete error:', error);
    }
  };

  const getModalTitle = () => {
    const action = isEdit ? 'Edit' : 'Add';
    const categoryTitle = normalizedCategory === 'incomes' ? 'Income' :
                         normalizedCategory === 'expenses' ? 'Expense' :
                         normalizedCategory === 'assets' ? 'Asset' : 'Liability';
    return `${action} ${categoryTitle}`;
  };

  const getModalIcon = () => {
    return normalizedCategory === 'incomes' ? '💼' :
           normalizedCategory === 'expenses' ? '💰' :
           normalizedCategory === 'assets' ? '📈' : '💳';
  };

  const isLoading = createAssetMutation.isPending || updateAssetMutation.isPending ||
                   createLiabilityMutation.isPending || updateLiabilityMutation.isPending ||
                   createIncomeMutation.isPending || updateIncomeMutation.isPending ||
                   createExpenseMutation.isPending || updateExpenseMutation.isPending ||
                   deleteAssetMutation.isPending || deleteLiabilityMutation.isPending ||
                   deleteIncomeMutation.isPending || deleteExpenseMutation.isPending;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100]">
      <div className="bg-gray-800 rounded-lg border border-gray-700 w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center">
              <span className="text-white text-lg">{getModalIcon()}</span>
            </div>
            <h2 className="text-lg font-semibold text-white">{getModalTitle()}</h2>
          </div>
          <div className="flex items-center gap-3">
            {isEdit && (
              <button
                onClick={handleDelete}
                className="w-8 h-8 rounded-full hover:bg-red-600/20 flex items-center justify-center text-gray-400 hover:text-red-400 transition-colors"
                disabled={isLoading}
                title="Delete item"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full hover:bg-gray-700 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
              disabled={isLoading}
              title="Close"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              {normalizedCategory === 'incomes' ? 'Source' : normalizedCategory === 'expenses' ? 'Payee' : 'Name'}
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-emerald-500"
              placeholder="Enter name"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                {normalizedCategory === 'assets' ? 'Current Value' : normalizedCategory === 'liabilities' ? 'Balance' : 'Amount'}
              </label>
              <input
                type="number"
                value={formData.amount}
                onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-emerald-500"
                placeholder="0"
                min="0"
                step="0.01"
                required
              />
            </div>

            {(normalizedCategory === 'incomes' || normalizedCategory === 'expenses') && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Frequency</label>
                <select
                  value={formData.frequency}
                  onChange={(e) => setFormData(prev => ({ ...prev, frequency: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="weekly">Weekly</option>
                  <option value="biweekly">Bi-weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>
            )}

            {normalizedCategory === 'assets' && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Annual Growth Rate (%)</label>
                <input
                  type="number"
                  value={formData.annualGrowthRate}
                  onChange={(e) => setFormData(prev => ({ ...prev, annualGrowthRate: e.target.value }))}
                  step="0.1"
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-emerald-500"
                  placeholder="7.0"
                />
              </div>
            )}
          </div>

          {normalizedCategory === 'liabilities' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Interest Rate APR (%)</label>
                <input
                  type="number"
                  value={formData.interestRateApr}
                  onChange={(e) => setFormData(prev => ({ ...prev, interestRateApr: e.target.value }))}
                  step="0.1"
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-emerald-500"
                  placeholder="4.5"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Min Payment</label>
                <input
                  type="number"
                  value={formData.minimumPayment}
                  onChange={(e) => setFormData(prev => ({ ...prev, minimumPayment: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-emerald-500"
                  placeholder="100"
                  min="0"
                  step="0.01"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Category</label>
            <input
              type="text"
              value={formData.category}
              onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-emerald-500"
              placeholder="e.g., salary, retirement, mortgage"
            />
          </div>

          {/* Footer */}
          <div className="flex justify-between pt-4 border-t border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-6 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-600 text-white rounded-lg transition-colors"
            >
              {isLoading ? 'Saving...' : (isEdit ? 'Update' : 'Add')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}