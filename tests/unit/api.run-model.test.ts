import { afterEach, describe, expect, it, vi } from "vitest";

import { POST } from "@/app/api/runModel/route";
import * as financial from "@/lib/financial";

const buildRequest = (body: unknown) =>
  new Request("https://example.com/api/runModel", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

const basePayload = {
  assets: [
    {
      id: "asset-1",
      name: "Brokerage",
      category: "brokerage",
      currentValue: 200_000,
      annualGrowthRate: 0.06,
    },
  ],
  liabilities: [
    {
      id: "liability-1",
      name: "Mortgage",
      category: "mortgage",
      currentBalance: 150_000,
      interestRateApr: 0.04,
      minimumPayment: 2_000,
    },
  ],
  monthlyIncome: 9_500,
  monthlyExpenses: 4_200,
  currentAge: 35,
  retirementAge: 60,
  startYear: 2024,
};

describe("POST /api/runModel", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns a computed timeline for valid payloads", async () => {
    const spy = vi.spyOn(financial, "computeNetWorth");

    const response = await POST(buildRequest(basePayload));
    expect(response.status).toBe(200);

    const payload = await response.json();
    expect(Array.isArray(payload.netWorthTimeline)).toBe(true);
    expect(payload.netWorthTimeline.length).toBeGreaterThan(1);
    expect(payload.meta).toMatchObject({
      assetCount: 1,
      liabilityCount: 1,
    });

    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({
        monthlyCashFlow: {
          monthlyIncome: 9_500,
          monthlyExpenses: 4_200,
          netMonthly: 5_300,
        },
        currentAge: 35,
        retirementAge: 60,
      })
    );
  });

  it("returns 400 when payload validation fails", async () => {
    const response = await POST(
      buildRequest({
        monthlyIncome: 5_000,
        // missing currentAge required by schema
      })
    );

    expect(response.status).toBe(400);
    const payload = await response.json();
    expect(payload.error).toBe("Invalid projection payload");
    expect(payload.details).toBeDefined();
  });

  it("returns 500 when computeNetWorth throws", async () => {
    vi.spyOn(financial, "computeNetWorth").mockImplementation(() => {
      throw new Error("engine exploded");
    });

    const response = await POST(buildRequest(basePayload));
    expect(response.status).toBe(500);

    const payload = await response.json();
    expect(payload.error).toBe("Failed to compute projections");
  });

  it("fills defaults for minimal payloads", async () => {
    const spy = vi.spyOn(financial, "computeNetWorth");

    const response = await POST(
      buildRequest({
        assets: [
          {
            currentValue: 10_000,
          },
        ],
        liabilities: [
          {
            currentBalance: 2_000,
          },
        ],
        currentAge: 40,
      })
    );

    expect(response.status).toBe(200);
    const args = spy.mock.calls[0][0];
    expect(args.assets[0].id).toMatch(/^asset-/);
    expect(args.assets[0].name).toContain("Asset");
    expect(args.assets[0].category).toBe("unspecified");
    expect(args.liabilities[0].id).toMatch(/^liability-/);
    expect(args.monthlyCashFlow.monthlyIncome).toBe(0);
    expect(args.monthlyCashFlow.netMonthly).toBe(0);
  });
});
