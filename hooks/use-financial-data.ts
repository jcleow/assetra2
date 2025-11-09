"use client";

import { useCallback } from "react";
import useSWR, { useSWRConfig } from "swr";

import { toast } from "@/components/toast";
import {
  type Asset,
  type AssetCreatePayload,
  type AssetUpdatePayload,
  type CashFlowSnapshot,
  type Expense,
  type ExpenseCreatePayload,
  type ExpenseUpdatePayload,
  FinancialClient,
  FinancialClientError,
  type Income,
  type IncomeCreatePayload,
  type IncomeUpdatePayload,
  type Liability,
  type LiabilityCreatePayload,
  type LiabilityUpdatePayload,
} from "@/lib/financial";
import { generateUUID } from "@/lib/utils";

const client = new FinancialClient();

const SWR_KEYS = {
  assets: "financial-assets",
  liabilities: "financial-liabilities",
  incomes: "financial-incomes",
  expenses: "financial-expenses",
  cashflow: "financial-cashflow",
} as const;

type ResourceApi<
  TEntity extends { id: string; updatedAt: string },
  TCreate extends Partial<TEntity>,
  TUpdate extends Partial<TEntity> & { id: string },
> = {
  list: () => Promise<TEntity[]>;
  create: (payload: TCreate) => Promise<TEntity>;
  update: (payload: TUpdate) => Promise<TEntity>;
  delete: (id: string) => Promise<void>;
};

type UseFinancialResourceResult<
  TEntity extends { id: string; updatedAt: string },
  TCreate extends Partial<TEntity>,
  TUpdate extends Partial<TEntity> & { id: string },
> = {
  data: TEntity[] | undefined;
  isLoading: boolean;
  isValidating: boolean;
  error: unknown;
  createItem: (payload: TCreate) => Promise<TEntity | undefined>;
  updateItem: (payload: TUpdate) => Promise<TEntity | undefined>;
  deleteItem: (id: string) => Promise<void>;
  refresh: () => Promise<TEntity[] | undefined>;
};

type MutationSideEffect = () => void | Promise<void>;

function formatErrorMessage(action: string, error: unknown): string {
  if (error instanceof FinancialClientError) {
    if (
      error.details &&
      typeof error.details === "object" &&
      "error" in error.details &&
      typeof (error.details as { error?: string }).error === "string"
    ) {
      return (error.details as { error: string }).error;
    }
    return `Request failed (${error.status}) while attempting to ${action}.`;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return `Unable to ${action} right now. Please try again.`;
}

function useFinancialResource<
  TEntity extends { id: string; updatedAt: string },
  TCreate extends Partial<TEntity>,
  TUpdate extends Partial<TEntity> & { id: string },
>(params: {
  key: string;
  resource: ResourceApi<TEntity, TCreate, TUpdate>;
  entityLabel: string;
  buildOptimisticEntity: (payload: TCreate) => TEntity;
  onMutation?: MutationSideEffect;
}): UseFinancialResourceResult<TEntity, TCreate, TUpdate> {
  const { key, resource, entityLabel, buildOptimisticEntity, onMutation } =
    params;

  const { data, error, isLoading, isValidating, mutate } = useSWR<TEntity[]>(
    key,
    () => resource.list(),
    { revalidateOnFocus: false }
  );

  const handleFailure = useCallback((action: string, err: unknown) => {
    const description = formatErrorMessage(action, err);
    toast({ type: "error", description });
  }, []);

  const createItem = useCallback(
    async (payload: TCreate) => {
      const optimisticEntity = buildOptimisticEntity(payload);
      let createdEntity: TEntity | undefined;

      try {
        await mutate(
          async (current = []) => {
            createdEntity = await resource.create(payload);
            return [
              ...current.filter((item) => item.id !== optimisticEntity.id),
              createdEntity,
            ];
          },
          {
            optimisticData: (current = []) => [...current, optimisticEntity],
            rollbackOnError: true,
            populateCache: true,
            revalidate: false,
          }
        );
        await onMutation?.();
        return createdEntity;
      } catch (err) {
        handleFailure(`create ${entityLabel}`, err);
        throw err;
      }
    },
    [
      buildOptimisticEntity,
      entityLabel,
      handleFailure,
      mutate,
      onMutation,
      resource,
    ]
  );

  const updateItem = useCallback(
    async (payload: TUpdate) => {
      let updatedEntity: TEntity | undefined;

      try {
        await mutate(
          async (current = []) => {
            updatedEntity = await resource.update(payload);
            return current.map((item) =>
              item.id === updatedEntity?.id ? updatedEntity : item
            );
          },
          {
            optimisticData: (current = []) =>
              current.map((item) =>
                item.id === payload.id
                  ? ({
                      ...item,
                      ...(payload as Partial<TEntity>),
                      updatedAt: new Date().toISOString(),
                    } as TEntity)
                  : item
              ),
            rollbackOnError: true,
            populateCache: true,
            revalidate: false,
          }
        );
        await onMutation?.();
        return updatedEntity;
      } catch (err) {
        handleFailure(`update ${entityLabel}`, err);
        throw err;
      }
    },
    [entityLabel, handleFailure, mutate, onMutation, resource]
  );

  const deleteItem = useCallback(
    async (id: string) => {
      try {
        await mutate(
          async (current = []) => {
            await resource.delete(id);
            return current.filter((item) => item.id !== id);
          },
          {
            optimisticData: (current = []) =>
              current.filter((item) => item.id !== id),
            rollbackOnError: true,
            populateCache: true,
            revalidate: false,
          }
        );
        await onMutation?.();
      } catch (err) {
        handleFailure(`delete ${entityLabel}`, err);
        throw err;
      }
    },
    [entityLabel, handleFailure, mutate, onMutation, resource]
  );

  const refresh = useCallback(() => mutate(), [mutate]);

  return {
    data,
    error,
    isLoading,
    isValidating,
    createItem,
    updateItem,
    deleteItem,
    refresh,
  };
}

const now = () => new Date().toISOString();

const buildAssetOptimistic = (payload: AssetCreatePayload): Asset => ({
  id: payload.id ?? generateUUID(),
  name: payload.name,
  category: payload.category,
  currentValue: payload.currentValue,
  annualGrowthRate: payload.annualGrowthRate,
  notes: payload.notes ?? null,
  updatedAt: now(),
});

const buildLiabilityOptimistic = (
  payload: LiabilityCreatePayload
): Liability => ({
  id: payload.id ?? generateUUID(),
  name: payload.name,
  category: payload.category,
  currentBalance: payload.currentBalance,
  interestRateApr: payload.interestRateApr,
  minimumPayment: payload.minimumPayment,
  notes: payload.notes ?? null,
  updatedAt: now(),
});

const buildIncomeOptimistic = (payload: IncomeCreatePayload): Income => ({
  id: payload.id ?? generateUUID(),
  source: payload.source,
  amount: payload.amount,
  frequency: payload.frequency,
  startDate: payload.startDate,
  category: payload.category,
  notes: payload.notes ?? null,
  updatedAt: now(),
});

const buildExpenseOptimistic = (payload: ExpenseCreatePayload): Expense => ({
  id: payload.id ?? generateUUID(),
  payee: payload.payee,
  amount: payload.amount,
  frequency: payload.frequency,
  category: payload.category,
  notes: payload.notes ?? null,
  updatedAt: now(),
});

export function useAssets() {
  return useFinancialResource<Asset, AssetCreatePayload, AssetUpdatePayload>({
    key: SWR_KEYS.assets,
    resource: client.assets,
    entityLabel: "asset",
    buildOptimisticEntity: buildAssetOptimistic,
  });
}

export function useLiabilities() {
  return useFinancialResource<
    Liability,
    LiabilityCreatePayload,
    LiabilityUpdatePayload
  >({
    key: SWR_KEYS.liabilities,
    resource: client.liabilities,
    entityLabel: "liability",
    buildOptimisticEntity: buildLiabilityOptimistic,
  });
}

export function useIncomes() {
  const { mutate } = useSWRConfig();
  return useFinancialResource<Income, IncomeCreatePayload, IncomeUpdatePayload>(
    {
      key: SWR_KEYS.incomes,
      resource: client.incomes,
      entityLabel: "income",
      buildOptimisticEntity: buildIncomeOptimistic,
      onMutation: () => mutate(SWR_KEYS.cashflow),
    }
  );
}

export function useExpenses() {
  const { mutate } = useSWRConfig();
  return useFinancialResource<
    Expense,
    ExpenseCreatePayload,
    ExpenseUpdatePayload
  >({
    key: SWR_KEYS.expenses,
    resource: client.expenses,
    entityLabel: "expense",
    buildOptimisticEntity: buildExpenseOptimistic,
    onMutation: () => mutate(SWR_KEYS.cashflow),
  });
}

export function useCashFlowSnapshot() {
  const { data, error, isLoading, isValidating, mutate } =
    useSWR<CashFlowSnapshot>(
      SWR_KEYS.cashflow,
      () => client.cashflowSummary(),
      {
        revalidateOnFocus: false,
      }
    );

  const refresh = useCallback(() => mutate(), [mutate]);

  return {
    data,
    error,
    isLoading,
    isValidating,
    refresh,
  };
}
