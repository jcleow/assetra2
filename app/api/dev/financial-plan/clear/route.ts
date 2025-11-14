"use server";

import { NextResponse } from "next/server";

import { clearFinancialPlanData } from "@/lib/server/financial-plan-admin";

export async function POST() {
  try {
    await clearFinancialPlanData();
    return NextResponse.json({ status: "ok" }, { status: 200 });
  } catch (error) {
    console.error("Failed to clear financial data", error);
    return NextResponse.json(
      { error: "Unable to clear financial data" },
      { status: 500 }
    );
  }
}
