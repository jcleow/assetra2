"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type React from "react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { financialClient } from "@/lib/financial/client";
import type { AssetCreatePayload } from "@/lib/financial/types";

interface CPFBalanceFormProps {
  onClose: () => void;
}

interface CPFBalances {
  ordinaryAccount: string;
  specialAccount: string;
  medisaveAccount: string;
}

export function CPFBalanceForm({ onClose }: CPFBalanceFormProps) {
  const queryClient = useQueryClient();

  const [balances, setBalances] = useState<CPFBalances>({
    ordinaryAccount: "",
    specialAccount: "",
    medisaveAccount: "",
  });

  const [errors, setErrors] = useState<Partial<CPFBalances>>({});

  const createCPFAssetsMutation = useMutation({
    mutationFn: async (cpfBalances: CPFBalances) => {
      const cpfAssets: AssetCreatePayload[] = [
        {
          name: "CPF Ordinary Account",
          category: "retirement",
          currentValue: Number.parseFloat(cpfBalances.ordinaryAccount),
          annualGrowthRate: 0.025, // 2.5%
          notes: "CPF OA - Can be used for housing, insurance, investments",
        },
        {
          name: "CPF Special Account",
          category: "retirement",
          currentValue: Number.parseFloat(cpfBalances.specialAccount),
          annualGrowthRate: 0.04, // 4%
          notes: "CPF SA - For retirement and approved investments only",
        },
        {
          name: "CPF Medisave Account",
          category: "retirement",
          currentValue: Number.parseFloat(cpfBalances.medisaveAccount),
          annualGrowthRate: 0.04, // 4%
          notes: "CPF MA - For healthcare expenses and approved insurance",
        },
      ];

      // Create all CPF assets
      const promises = cpfAssets.map(asset =>
        financialClient.assets.create(asset)
      );

      return Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assets"] });
      onClose();
    },
    onError: (error) => {
      console.error("Failed to create CPF assets:", error);
    },
  });

  const validateBalances = (): boolean => {
    const newErrors: Partial<CPFBalances> = {};

    if (!balances.ordinaryAccount.trim()) {
      newErrors.ordinaryAccount = "Ordinary Account balance is required";
    } else if (Number.isNaN(Number.parseFloat(balances.ordinaryAccount))) {
      newErrors.ordinaryAccount = "Please enter a valid number";
    }

    if (!balances.specialAccount.trim()) {
      newErrors.specialAccount = "Special Account balance is required";
    } else if (Number.isNaN(Number.parseFloat(balances.specialAccount))) {
      newErrors.specialAccount = "Please enter a valid number";
    }

    if (!balances.medisaveAccount.trim()) {
      newErrors.medisaveAccount = "Medisave Account balance is required";
    } else if (Number.isNaN(Number.parseFloat(balances.medisaveAccount))) {
      newErrors.medisaveAccount = "Please enter a valid number";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (validateBalances()) {
      createCPFAssetsMutation.mutate(balances);
    }
  };

  const handleInputChange = (field: keyof CPFBalances, value: string) => {
    setBalances(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg bg-gray-800 p-6 text-white">
        <h2 className="mb-4 text-lg font-semibold">Add CPF Balances</h2>
        <p className="mb-6 text-sm text-gray-400">
          Enter your current CPF account balances. These will be added as assets to track your retirement savings.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="oa-balance" className="text-gray-200">
              Ordinary Account (OA) Balance
            </Label>
            <Input
              id="oa-balance"
              type="number"
              step="0.01"
              placeholder="45000.00"
              value={balances.ordinaryAccount}
              onChange={(e) => handleInputChange("ordinaryAccount", e.target.value)}
              className="mt-1 border-gray-700 bg-gray-900 text-white"
            />
            {errors.ordinaryAccount && (
              <p className="mt-1 text-sm text-red-400">{errors.ordinaryAccount}</p>
            )}
          </div>

          <div>
            <Label htmlFor="sa-balance" className="text-gray-200">
              Special Account (SA) Balance
            </Label>
            <Input
              id="sa-balance"
              type="number"
              step="0.01"
              placeholder="25000.00"
              value={balances.specialAccount}
              onChange={(e) => handleInputChange("specialAccount", e.target.value)}
              className="mt-1 border-gray-700 bg-gray-900 text-white"
            />
            {errors.specialAccount && (
              <p className="mt-1 text-sm text-red-400">{errors.specialAccount}</p>
            )}
          </div>

          <div>
            <Label htmlFor="ma-balance" className="text-gray-200">
              Medisave Account (MA) Balance
            </Label>
            <Input
              id="ma-balance"
              type="number"
              step="0.01"
              placeholder="15000.00"
              value={balances.medisaveAccount}
              onChange={(e) => handleInputChange("medisaveAccount", e.target.value)}
              className="mt-1 border-gray-700 bg-gray-900 text-white"
            />
            {errors.medisaveAccount && (
              <p className="mt-1 text-sm text-red-400">{errors.medisaveAccount}</p>
            )}
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1 border-gray-700 text-gray-300 hover:bg-gray-700"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createCPFAssetsMutation.isPending}
              className="flex-1 bg-emerald-500 hover:bg-emerald-600"
            >
              {createCPFAssetsMutation.isPending ? "Adding..." : "Add CPF Balances"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}