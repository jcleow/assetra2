"use server";

import { NextResponse } from "next/server";

import { seedDefaultFinancialPlan } from "@/lib/server/financial-plan-admin";
import { buildDefaultFinancialPlan } from "@/lib/financial/default-plan";
import { PROPERTY_PLANNER_MOCKS } from "@/components/property-planner/mock-data";

export async function POST() {
  try {
    await seedDefaultFinancialPlan();
    return NextResponse.json({ status: "ok" }, { status: 201 });
  } catch (error) {
    console.error("Failed to populate default financial data", error);
    return NextResponse.json(
      {
        status: "fallback",
        snapshot: buildDefaultFinancialPlan(),
        plannerScenarios: Object.values(PROPERTY_PLANNER_MOCKS),
      },
      { status: 200 }
    );
  }
}
