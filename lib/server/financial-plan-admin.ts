import { FinancialClient } from "@/lib/financial/client";
import { buildDefaultFinancialPlan } from "@/lib/financial/default-plan";
import type { FinancialPlanPayload } from "@/lib/financial/plan-schema";
import {
  PROPERTY_PLANNER_MOCKS,
  type PropertyPlannerType,
} from "@/components/property-planner/mock-data";
import type {
  PropertyPlannerScenario,
  PropertyPlannerScenarioCreatePayload,
} from "@/lib/financial/types";

const adminClient = new FinancialClient({
  baseUrl: process.env.GO_SERVICE_URL || "http://localhost:8080",
});

const propertyTypes: PropertyPlannerType[] = ["hdb", "condo", "landed"];

export async function clearFinancialPlanData() {
  const [assets, liabilities, incomes, expenses, scenarios] = await Promise.all(
    [
      adminClient.assets.list(),
      adminClient.liabilities.list(),
      adminClient.incomes.list(),
      adminClient.expenses.list(),
      adminClient.propertyPlanner.list(),
    ]
  );

  await Promise.all([
    ...assets.map((asset) => adminClient.assets.delete(asset.id)),
    ...liabilities.map((item) => adminClient.liabilities.delete(item.id)),
    ...incomes.map((item) => adminClient.incomes.delete(item.id)),
    ...expenses.map((item) => adminClient.expenses.delete(item.id)),
    ...scenarios.map((scenario) =>
      adminClient.propertyPlanner.delete(scenario.id)
    ),
  ]);
}

export async function seedDefaultFinancialPlan() {
  const plan = buildDefaultFinancialPlan();
  await clearFinancialPlanData();

  await Promise.all([
    ...plan.assets.map((asset) =>
      adminClient.assets.create({
        id: asset.id,
        name: asset.name,
        category: asset.category,
        currentValue: asset.currentValue,
        annualGrowthRate: asset.annualGrowthRate,
        notes: asset.notes ?? undefined,
      })
    ),
    ...plan.liabilities.map((liability) =>
      adminClient.liabilities.create({
        id: liability.id,
        name: liability.name,
        category: liability.category,
        currentBalance: liability.currentBalance,
        interestRateApr: liability.interestRateApr,
        minimumPayment: liability.minimumPayment,
        notes: liability.notes ?? undefined,
      })
    ),
    ...plan.incomes.map((income) =>
      adminClient.incomes.create({
        id: income.id,
        source: income.source,
        amount: income.amount,
        frequency: income.frequency,
        startDate: income.startDate,
        category: income.category,
        notes: income.notes ?? undefined,
      })
    ),
    ...plan.expenses.map((expense) =>
      adminClient.expenses.create({
        id: expense.id,
        payee: expense.payee,
        amount: expense.amount,
        frequency: expense.frequency,
        category: expense.category,
        notes: expense.notes ?? undefined,
      })
    ),
  ]);

  await Promise.all(
    propertyTypes.map(async (type) => {
      const scenario = PROPERTY_PLANNER_MOCKS[type];
      const payload: PropertyPlannerScenarioCreatePayload = stripPlannerFields(
        scenario
      );
      await adminClient.propertyPlanner.create(payload);
    })
  );

  return plan;
}

function stripPlannerFields(
  scenario: PropertyPlannerScenario
): PropertyPlannerScenarioCreatePayload {
  const { updatedAt: _updatedAt, ...rest } = scenario;
  return rest;
}
