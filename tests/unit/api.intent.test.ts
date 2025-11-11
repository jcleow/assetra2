import { describe, expect, it, vi } from "vitest";

// Mock fetch at the top level
vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
  ok: true,
  json: async () => ({
    assets: [{ name: "house", currentValue: 500000 }],
    liabilities: [{ name: "mortgage", currentBalance: 350000 }],
    incomes: [{ source: "salary", amount: 8500 }],
    expenses: [{ payee: "rent", amount: 2500 }]
  })
}));

import { POST } from "@/app/api/intent/route";

const buildRequest = (message: unknown) =>
  new Request("https://example.com/api/intent", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(message),
  });

describe("POST /api/intent", () => {
  it("returns parsed actions", async () => {
    const response = await POST(
      buildRequest({ message: "Add $500 to savings and remove 100 from debt" })
    );
    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.actions).toHaveLength(2);
    expect(payload.intentId).toBeDefined();
  });

  it("rejects invalid payloads", async () => {
    const response = await POST(buildRequest({}));
    expect(response.status).toBe(400);
  });
});
