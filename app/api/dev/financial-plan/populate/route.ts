"use server";

import { NextResponse } from "next/server";

import { seedDefaultFinancialPlan } from "@/lib/server/financial-plan-admin";

export async function POST() {
  try {
    const snapshot = await seedDefaultFinancialPlan();
    return NextResponse.json(
      { status: "ok", snapshot },
      { status: 201 }
    );
  } catch (error) {
    console.error("Failed to populate default financial data", error);
    return NextResponse.json(
      { error: "Unable to populate default financial data" },
      { status: 500 }
    );
  }
}
