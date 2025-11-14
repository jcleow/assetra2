"use server";

import { NextResponse } from "next/server";

import { financialClient, FinancialClientError } from "@/lib/financial/client";
import type {
  PropertyPlannerScenario,
  PropertyPlannerScenarioCreatePayload,
} from "@/lib/financial/types";
import { PROPERTY_PLANNER_MOCKS } from "@/components/property-planner/mock-data";

function fallbackScenarios(): PropertyPlannerScenario[] {
  return Object.entries(PROPERTY_PLANNER_MOCKS).map(
    ([type, scenario], index) => ({
      ...scenario,
      id: scenario.id || `${type}-${index}`,
    })
  );
}

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

const buildFallbackScenario = (
  payload: PropertyPlannerScenarioCreatePayload
): PropertyPlannerScenario => ({
  ...payload,
  id: payload.id && payload.id.length > 0 ? payload.id : `fallback-${Date.now()}`,
  updatedAt: new Date().toISOString(),
});

export async function GET() {
  try {
    const scenarios = await financialClient.propertyPlanner.list();
    return NextResponse.json(scenarios, { status: 200 });
  } catch (error) {
    console.warn(
      "Falling back to mock property planner scenarios due to backend failure",
      error
    );
    return NextResponse.json(fallbackScenarios(), { status: 200 });
  }
}

export async function POST(request: Request) {
  const payload =
    (await request.json()) as PropertyPlannerScenarioCreatePayload;
  try {
    const created = await financialClient.propertyPlanner.create(payload);
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    if (isNetworkError(error)) {
      console.warn(
        "Planner backend unreachable, echoing fallback scenario create",
        error
      );
      return NextResponse.json(buildFallbackScenario(payload), {
        status: 201,
      });
    }
    return handlePlannerError(error);
  }
}
