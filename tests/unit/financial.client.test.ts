import { describe, expect, it, vi } from "vitest";

import {
  type Asset,
  FinancialClient,
  FinancialClientError,
} from "@/lib/financial";

const sampleAsset: Asset = {
  id: "asset-123",
  name: "Brokerage Fund",
  category: "brokerage",
  currentValue: 1000,
  annualGrowthRate: 0.05,
  notes: null,
  updatedAt: "2024-01-01T00:00:00.000Z",
};

describe("FinancialClient", () => {
  it("parses collection responses via schemas", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify([sampleAsset]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    const client = new FinancialClient({
      baseUrl: "https://api.example.test/finance",
      fetchFn: fetchMock,
    });

    const result = await client.assets.list();

    expect(result).toEqual([sampleAsset]);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.example.test/finance/assets",
      expect.objectContaining({
        method: "GET",
        signal: undefined,
        headers: expect.any(Headers),
      })
    );
  });

  it("raises FinancialClientError for non-2xx responses and surfaces details", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: "boom" }), {
        status: 422,
        headers: { "Content-Type": "application/json" },
      })
    );

    const client = new FinancialClient({
      baseUrl: "https://api.example.test/finance",
      fetchFn: fetchMock,
    });

    const failingRequest = client.assets.get("asset-42");

    await expect(failingRequest).rejects.toBeInstanceOf(FinancialClientError);
    await expect(failingRequest).rejects.toMatchObject({
      status: 422,
      details: { error: "boom" },
    });
  });
});
