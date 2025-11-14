"use server";

import { NextResponse } from "next/server";

import { financialClient, FinancialClientError } from "@/lib/financial/client";
import { buildPlannerNote } from "@/lib/property-planner/constants";

interface ApplyRequestBody {
  scenarioId: string;
}

function handleError(error: unknown) {
  if (error instanceof FinancialClientError) {
    return NextResponse.json(
      {
        error: "Planner backend error",
        details: error.details ?? error.message,
      },
      { status: error.status }
    );
  }
  console.error("Failed to apply property planner scenario", error);
  return NextResponse.json(
    { error: "Failed to apply property planner scenario" },
    { status: 500 }
  );
}

export async function POST(request: Request) {
  try {
    const { scenarioId } = (await request.json()) as ApplyRequestBody;
    if (!scenarioId) {
      return NextResponse.json(
        { error: "scenarioId is required" },
        { status: 400 }
      );
    }

    const scenario = await financialClient.propertyPlanner.get(scenarioId);
    const note = buildPlannerNote({
      scenarioId,
      scenarioType: scenario.type,
    });

    const liabilities = await financialClient.liabilities.list();
    const existingLiability = liabilities.find((item) => item.notes === note);
    const liabilityPayload = {
      name: `${scenario.headline} Mortgage`,
      category: "mortgage",
      currentBalance: scenario.inputs.loanAmount,
      interestRateApr: scenario.inputs.fixedRate / 100,
      minimumPayment: scenario.snapshot.monthlyPayment,
      notes: note,
    };

    const liabilityResult = existingLiability
      ? await financialClient.liabilities.update({
          id: existingLiability.id,
          ...liabilityPayload,
        })
      : await financialClient.liabilities.create(liabilityPayload);

    const expenses = await financialClient.expenses.list();
    const existingExpense = expenses.find((expense) => expense.notes === note);
    const expensePayload = {
      payee: `${scenario.headline} Mortgage Payment`,
      amount: scenario.snapshot.monthlyPayment,
      frequency: "monthly" as const,
      category: "mortgage",
      notes: note,
    };

    const expenseResult = existingExpense
      ? await financialClient.expenses.update({
          id: existingExpense.id,
          ...expensePayload,
        })
      : await financialClient.expenses.create(expensePayload);

    return NextResponse.json(
      {
        liabilityId: liabilityResult.id,
        expenseId: expenseResult.id,
      },
      { status: 200 }
    );
  } catch (error) {
    return handleError(error);
  }
}
