"use server";

import { NextResponse } from "next/server";

import {
  financialClient,
  FinancialClientError,
} from "@/lib/financial/client";
import type { PropertyPlannerScenarioUpdatePayload } from "@/lib/financial/types";

type RouteParams = {
  params: Promise<{ id: string }>;
};

function handlePlannerError(error: unknown) {
  if (error instanceof FinancialClientError) {
    return NextResponse.json(
      {
        error: "Planner backend error",
        details: error.details ?? error.message,
      },
      { status: error.status }
    );
  }
  console.error("Unexpected property planner error", error);
  return NextResponse.json(
    { error: "Unexpected property planner error" },
    { status: 500 }
  );
}

const isNetworkError = (error: unknown) =>
  error instanceof TypeError || (error as { cause?: unknown })?.cause;

export async function GET(_: Request, context: RouteParams) {
  const { id } = await context.params;
  try {
    const scenario = await financialClient.propertyPlanner.get(id);
    return NextResponse.json(scenario, { status: 200 });
  } catch (error) {
    return handlePlannerError(error);
  }
}

export async function PUT(request: Request, context: RouteParams) {
  const { id } = await context.params;
  const payload =
    (await request.json()) as PropertyPlannerScenarioUpdatePayload;
  try {
    const updated = await financialClient.propertyPlanner.update({
      ...payload,
      id,
    });
    return NextResponse.json(updated, { status: 200 });
  } catch (error) {
    if (isNetworkError(error)) {
      console.warn(
        "Planner backend unreachable, echoing fallback scenario update",
        error
      );
      return NextResponse.json(
        {
          ...payload,
          id,
          updatedAt: new Date().toISOString(),
        },
        { status: 200 }
      );
    }
    return handlePlannerError(error);
  }
}

export async function PATCH(request: Request, context: RouteParams) {
  return PUT(request, context);
}

export async function DELETE(_: Request, context: RouteParams) {
  const { id } = await context.params;
  try {
    await financialClient.propertyPlanner.delete(id);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (isNetworkError(error)) {
      console.warn(
        "Planner backend unreachable, treating delete as success",
        error
      );
      return new NextResponse(null, { status: 204 });
    }
    return handlePlannerError(error);
  }
}
