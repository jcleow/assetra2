"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import type React from "react";
import { useEffect, useState } from "react";
import { useFinancialPlanningStore } from "@/features/financial-planning";
import { financialClient } from "@/lib/financial/client";
import type {
  Asset,
  AssetCreatePayload,
  Expense,
  ExpenseCreatePayload,
  Income,
  IncomeCreatePayload,
  Liability,
  LiabilityCreatePayload,
} from "@/lib/financial/types";
import { createCPFContributions, checkExistingCPFContributions, updateCPFContributions } from "@/lib/cpf/auto-contributions";
import {
  DEFAULT_SALARY_AGE,
  decodeCPFSalaryMetadata,
  encodeCPFSalaryMetadata,
  isSalaryIncomeRecord,
  normalizeSalaryAmount,
  type CPFSalaryInputType,
} from "@/lib/cpf/salary";

interface FinancialFormModalProps {
  type: string;
  onClose: () => void;
}

export function FinancialFormModal({ type, onClose }: FinancialFormModalProps) {
  console.log("FinancialFormModal opened with type:", type);

  const isEdit = type.includes("-");
  const category = isEdit ? type.split("-")[0] : type;
  const itemId = isEdit ? type.split("-").slice(1).join("-") : null;

  console.log("Parsed:", { isEdit, category, itemId });

  // Normalize category names (handle both singular and plural)
  const normalizedCategory =
    category === "income" || category === "incomes"
      ? "incomes"
      : category === "expense" || category === "expenses"
        ? "expenses"
        : category === "asset" || category === "assets"
          ? "assets"
          : category === "liability" || category === "liabilities"
            ? "liabilities"
            : category;

  console.log("Normalized category:", normalizedCategory);

  const queryClient = useQueryClient();
  const invalidateFinancialData = useFinancialPlanningStore(
    (state) => state.invalidateFinancialData
  );

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    amount: "",
    frequency: "monthly",
    category: "",
    annualGrowthRate: "7.0",
    interestRateApr: "4.5",
    minimumPayment: "",
    notes: "",
    salaryInputType: "gross" as CPFSalaryInputType,
  });

  const isSalaryIncomeForm =
    normalizedCategory === "incomes" &&
    isSalaryIncomeRecord(formData.name, formData.category);

  // Load existing data for edit mode
  useEffect(() => {
    if (isEdit && itemId) {
      const loadItem = async () => {
        try {
          let data: Asset | Liability | Income | Expense;

          switch (normalizedCategory) {
            case "assets":
              data = await financialClient.assets.get(itemId);
              setFormData({
                name: data.name,
                amount: data.currentValue.toString(),
                category: data.category,
                annualGrowthRate: (data.annualGrowthRate * 100).toString(),
                frequency: "monthly",
                interestRateApr: "4.5",
                minimumPayment: "",
                notes: "",
                salaryInputType: "gross",
              });
              break;
            case "liabilities":
              data = await financialClient.liabilities.get(itemId);
              setFormData({
                name: data.name,
                amount: data.currentBalance.toString(),
                category: data.category,
                interestRateApr: (data.interestRateApr * 100).toString(),
                minimumPayment: data.minimumPayment.toString(),
                frequency: "monthly",
                annualGrowthRate: "7.0",
                notes: "",
                salaryInputType: "gross",
              });
              break;
            case "incomes":
              data = await financialClient.incomes.get(itemId);
              const salaryMetadata = decodeCPFSalaryMetadata(data.notes);
              setFormData({
                name: data.source,
                amount: (salaryMetadata && salaryMetadata.inputType === "net"
                  ? salaryMetadata.netAmount
                  : data.amount
                ).toString(),
                frequency: data.frequency,
                category: data.category,
                annualGrowthRate: "7.0",
                interestRateApr: "4.5",
                minimumPayment: "",
                notes: data.notes ?? "",
                salaryInputType: salaryMetadata?.inputType ?? "gross",
              });
              break;
            case "expenses":
              data = await financialClient.expenses.get(itemId);
              setFormData({
                name: data.payee,
                amount: data.amount.toString(),
                frequency: data.frequency,
                category: data.category,
                annualGrowthRate: "7.0",
                interestRateApr: "4.5",
                minimumPayment: "",
                notes: "",
                salaryInputType: "gross",
              });
              break;
          }
        } catch (error) {
          console.error("Failed to load item for editing:", error);
        }
      };

      loadItem();
    }
  }, [isEdit, itemId, category]);

  // Mutations for CRUD operations
  const createAssetMutation = useMutation({
    mutationFn: (data: AssetCreatePayload) =>
      financialClient.assets.create(data),
    onSuccess: () => {
      console.log("Asset created successfully");
      queryClient.invalidateQueries({ queryKey: ["assets"] });
      invalidateFinancialData();
      onClose();
    },
    onError: (error) => {
      console.error("Failed to create asset:", error);
      alert("Failed to create asset. Please try again.");
    },
  });

  const updateAssetMutation = useMutation({
    mutationFn: (data: { id: string } & AssetCreatePayload) =>
      financialClient.assets.update(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assets"] });
      invalidateFinancialData();
      onClose();
    },
  });

  const createLiabilityMutation = useMutation({
    mutationFn: (data: LiabilityCreatePayload) =>
      financialClient.liabilities.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["liabilities"] });
      invalidateFinancialData();
      onClose();
    },
  });

  const updateLiabilityMutation = useMutation({
    mutationFn: (data: { id: string } & LiabilityCreatePayload) =>
      financialClient.liabilities.update(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["liabilities"] });
      invalidateFinancialData();
      onClose();
    },
  });

  const createIncomeMutation = useMutation({
    mutationFn: async (data: IncomeCreatePayload) => {
      // Create the main income
      const incomeResult = await financialClient.incomes.create(data);

      // Auto-create CPF contributions if this is salary income
      const isSalaryIncome = isSalaryIncomeRecord(data.source, data.category);

      if (isSalaryIncome) {
        try {
          // Check if CPF contributions already exist
          const hasCPFContributions = await checkExistingCPFContributions();

          if (!hasCPFContributions) {
            console.log("Creating CPF contributions for salary income");
            await createCPFContributions({
              monthlySalary: data.amount,
              age: DEFAULT_SALARY_AGE,
            });
          } else {
            console.log("CPF contributions already exist, skipping auto-creation");
          }
        } catch (cpfError) {
          console.warn("Failed to create CPF contributions, but salary income was created:", cpfError);
          // Don't fail the main operation if CPF creation fails
        }
      }

      return incomeResult;
    },
    onSuccess: () => {
      console.log("Income created successfully");
      queryClient.invalidateQueries({ queryKey: ["incomes"] });
      invalidateFinancialData();
      onClose();
    },
    onError: (error) => {
      console.error("Failed to create income:", error);
      alert("Failed to create income. Please try again.");
    },
  });

  const updateIncomeMutation = useMutation({
    mutationFn: async (data: { id: string } & IncomeCreatePayload) => {
      // Update the main income
      const incomeResult = await financialClient.incomes.update(data);

      // Update CPF contributions if this is salary income
      const isSalaryIncome = isSalaryIncomeRecord(data.source, data.category);

      if (isSalaryIncome) {
        try {
          console.log("Updating CPF contributions for changed salary income");
          await updateCPFContributions(data.amount, DEFAULT_SALARY_AGE);
        } catch (cpfError) {
          console.warn("Failed to update CPF contributions, but salary income was updated:", cpfError);
          // Don't fail the main operation if CPF update fails
        }
      }

      return incomeResult;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["incomes"] });
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      invalidateFinancialData();
      onClose();
    },
  });

  const createExpenseMutation = useMutation({
    mutationFn: (data: ExpenseCreatePayload) =>
      financialClient.expenses.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      invalidateFinancialData();
      onClose();
    },
  });

  // Delete mutations
  const deleteAssetMutation = useMutation({
    mutationFn: (id: string) => financialClient.assets.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assets"] });
      invalidateFinancialData();
      onClose();
    },
  });

  const deleteLiabilityMutation = useMutation({
    mutationFn: (id: string) => financialClient.liabilities.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["liabilities"] });
      invalidateFinancialData();
      onClose();
    },
  });

  const deleteIncomeMutation = useMutation({
    mutationFn: (id: string) => financialClient.incomes.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["incomes"] });
      invalidateFinancialData();
      onClose();
    },
  });

  const deleteExpenseMutation = useMutation({
    mutationFn: (id: string) => financialClient.expenses.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      invalidateFinancialData();
      onClose();
    },
  });

  const updateExpenseMutation = useMutation({
    mutationFn: (data: { id: string } & ExpenseCreatePayload) =>
      financialClient.expenses.update(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      invalidateFinancialData();
      onClose();
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    console.log("Form submitted with data:", formData);

    if (!formData.name.trim() || !formData.amount.trim()) {
      alert("Please fill in all required fields");
      return;
    }

    const baseData = {
      name: formData.name.trim(),
      amount: Number.parseFloat(formData.amount) || 0,
      category: formData.category.trim() || "other",
    };

    console.log("Processed base data:", baseData);

    try {
      switch (normalizedCategory) {
        case "assets": {
          const assetData = {
            name: baseData.name,
            category: baseData.category,
            currentValue: baseData.amount,
            annualGrowthRate:
              Number.parseFloat(formData.annualGrowthRate) / 100,
          };

          if (isEdit && itemId) {
            updateAssetMutation.mutate({ id: itemId, ...assetData });
          } else {
            createAssetMutation.mutate(assetData);
          }
          break;
        }

        case "liabilities": {
          const liabilityData = {
            name: baseData.name,
            category: baseData.category,
            currentBalance: baseData.amount,
            interestRateApr: Number.parseFloat(formData.interestRateApr) / 100,
            minimumPayment: Number.parseFloat(formData.minimumPayment) || 0,
          };

          if (isEdit && itemId) {
            updateLiabilityMutation.mutate({ id: itemId, ...liabilityData });
          } else {
            createLiabilityMutation.mutate(liabilityData);
          }
          break;
        }

        case "incomes": {
          const baseIncomeData = {
            source: baseData.name,
            amount: baseData.amount,
            frequency: formData.frequency as any,
            startDate: new Date().toISOString(),
            category: baseData.category,
          };

          let incomeData = { ...baseIncomeData } as IncomeCreatePayload;
          const salaryInputType: CPFSalaryInputType = formData.salaryInputType ?? "gross";
          if (isSalaryIncomeRecord(baseIncomeData.source, baseIncomeData.category)) {
            const { grossSalary, netSalary, cpfContribution } = normalizeSalaryAmount(
              baseIncomeData.amount,
              salaryInputType,
              DEFAULT_SALARY_AGE
            );
            incomeData = {
              ...incomeData,
              amount: grossSalary,
              notes: encodeCPFSalaryMetadata({
                inputType: salaryInputType,
                grossAmount: grossSalary,
                netAmount: netSalary,
                cpfEmployeeAmount: cpfContribution.employeeAmount,
                cpfEmployerAmount: cpfContribution.employerAmount,
                updatedAt: new Date().toISOString(),
              }),
            };
          } else if (formData.notes) {
            incomeData = {
              ...incomeData,
              notes: formData.notes,
            };
          }

          console.log("Creating income with data:", incomeData);

          if (isEdit && itemId) {
            updateIncomeMutation.mutate({ id: itemId, ...incomeData });
          } else {
            createIncomeMutation.mutate(incomeData);
          }
          break;
        }

        case "expenses": {
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
      }
    } catch (error) {
      console.error("Form submission error:", error);
    }
  };

  const handleDelete = async () => {
    if (!isEdit || !itemId) return;

    if (!confirm("Are you sure you want to delete this item?")) {
      return;
    }

    try {
      switch (normalizedCategory) {
        case "assets":
          deleteAssetMutation.mutate(itemId);
          break;
        case "liabilities":
          deleteLiabilityMutation.mutate(itemId);
          break;
        case "incomes":
          deleteIncomeMutation.mutate(itemId);
          break;
        case "expenses":
          deleteExpenseMutation.mutate(itemId);
          break;
      }
    } catch (error) {
      console.error("Delete error:", error);
    }
  };

  const getModalTitle = () => {
    const action = isEdit ? "Edit" : "Add";
    const categoryTitle =
      normalizedCategory === "incomes"
        ? "Income"
        : normalizedCategory === "expenses"
          ? "Expense"
          : normalizedCategory === "assets"
            ? "Asset"
            : "Liability";
    return `${action} ${categoryTitle}`;
  };

  const getModalIcon = () => {
    return normalizedCategory === "incomes"
      ? "💼"
      : normalizedCategory === "expenses"
        ? "💰"
        : normalizedCategory === "assets"
          ? "📈"
          : "💳";
  };

  const isLoading =
    createAssetMutation.isPending ||
    updateAssetMutation.isPending ||
    createLiabilityMutation.isPending ||
    updateLiabilityMutation.isPending ||
    createIncomeMutation.isPending ||
    updateIncomeMutation.isPending ||
    createExpenseMutation.isPending ||
    updateExpenseMutation.isPending ||
    deleteAssetMutation.isPending ||
    deleteLiabilityMutation.isPending ||
    deleteIncomeMutation.isPending ||
    deleteExpenseMutation.isPending;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-md rounded-lg border border-gray-700 bg-gray-800">
        {/* Header */}
        <div className="flex items-center justify-between border-gray-700 border-b p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500">
              <span className="text-lg text-white">{getModalIcon()}</span>
            </div>
            <h2 className="font-semibold text-lg text-white">
              {getModalTitle()}
            </h2>
          </div>
          <div className="flex items-center gap-3">
            {isEdit && (
              <button
                className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-red-600/20 hover:text-red-400"
                disabled={isLoading}
                onClick={handleDelete}
                title="Delete item"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
            <button
              className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-700 hover:text-white"
              disabled={isLoading}
              onClick={onClose}
              title="Close"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Form */}
        <form className="space-y-4 p-6" onSubmit={handleSubmit}>
          <div>
            <label className="mb-2 block font-medium text-gray-300 text-sm">
              {normalizedCategory === "incomes"
                ? "Source"
                : normalizedCategory === "expenses"
                  ? "Payee"
                  : "Name"}
            </label>
            <input
              className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-white placeholder-gray-400 focus:border-emerald-500 focus:outline-none"
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, name: e.target.value }))
              }
              placeholder="Enter name"
              required
              type="text"
              value={formData.name}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-2 block font-medium text-gray-300 text-sm">
                {normalizedCategory === "assets"
                  ? "Current Value"
                  : normalizedCategory === "liabilities"
                    ? "Balance"
                    : "Amount"}
              </label>
              <input
                className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-white placeholder-gray-400 focus:border-emerald-500 focus:outline-none"
                min="0"
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, amount: e.target.value }))
                }
                placeholder="0"
                required
                step="0.01"
                type="number"
                value={formData.amount}
              />
            </div>

            {(normalizedCategory === "incomes" ||
              normalizedCategory === "expenses") && (
              <div>
                <label className="mb-2 block font-medium text-gray-300 text-sm">
                  Frequency
                </label>
                <select
                  className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-white focus:border-emerald-500 focus:outline-none"
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      frequency: e.target.value,
                    }))
                  }
                  value={formData.frequency}
                >
                  <option value="weekly">Weekly</option>
                  <option value="biweekly">Bi-weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>
            )}

            {isSalaryIncomeForm && normalizedCategory === "incomes" && (
              <div className="col-span-2">
                <label className="flex items-center gap-2 text-gray-300 text-sm">
                  <input
                    checked={formData.salaryInputType === "net"}
                    className="h-4 w-4 rounded border-gray-600 bg-gray-700 text-emerald-500 focus:ring-emerald-500"
                    onChange={(event) =>
                      setFormData((prev) => ({
                        ...prev,
                        salaryInputType: event.target.checked ? "net" : "gross",
                      }))
                    }
                    type="checkbox"
                  />
                  Treat amount as net salary (after CPF)
                </label>
                <p className="mt-1 text-gray-400 text-xs">
                  We will convert this to a gross amount so CPF contributions and
                  auto-calculated employer amounts stay accurate.
                </p>
              </div>
            )}

            {normalizedCategory === "assets" && (
              <div>
                <label className="mb-2 block font-medium text-gray-300 text-sm">
                  Annual Growth Rate (%)
                </label>
                <input
                  className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-white placeholder-gray-400 focus:border-emerald-500 focus:outline-none"
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      annualGrowthRate: e.target.value,
                    }))
                  }
                  placeholder="7.0"
                  step="0.1"
                  type="number"
                  value={formData.annualGrowthRate}
                />
              </div>
            )}
          </div>

          {normalizedCategory === "liabilities" && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-2 block font-medium text-gray-300 text-sm">
                  Interest Rate APR (%)
                </label>
                <input
                  className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-white placeholder-gray-400 focus:border-emerald-500 focus:outline-none"
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      interestRateApr: e.target.value,
                    }))
                  }
                  placeholder="4.5"
                  step="0.1"
                  type="number"
                  value={formData.interestRateApr}
                />
              </div>
              <div>
                <label className="mb-2 block font-medium text-gray-300 text-sm">
                  Min Payment
                </label>
                <input
                  className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-white placeholder-gray-400 focus:border-emerald-500 focus:outline-none"
                  min="0"
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      minimumPayment: e.target.value,
                    }))
                  }
                  placeholder="100"
                  step="0.01"
                  type="number"
                  value={formData.minimumPayment}
                />
              </div>
            </div>
          )}

          <div>
            <label className="mb-2 block font-medium text-gray-300 text-sm">
              Category
            </label>
            <input
              className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-white placeholder-gray-400 focus:border-emerald-500 focus:outline-none"
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, category: e.target.value }))
              }
              placeholder="e.g., salary, retirement, mortgage"
              type="text"
              value={formData.category}
            />
          </div>

          {/* Footer */}
          <div className="flex justify-between border-gray-700 border-t pt-4">
            <button
              className="px-4 py-2 text-gray-400 transition-colors hover:text-white"
              disabled={isLoading}
              onClick={onClose}
              type="button"
            >
              Cancel
            </button>
            <button
              className="rounded-lg bg-emerald-500 px-6 py-2 text-white transition-colors hover:bg-emerald-600 disabled:bg-gray-600"
              disabled={isLoading}
              type="submit"
            >
              {isLoading ? "Saving..." : isEdit ? "Update" : "Add"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
