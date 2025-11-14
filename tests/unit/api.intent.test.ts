import { describe, expect, it, vi } from "vitest";

const mockParseIntent = vi.fn().mockResolvedValue({
  actions: [
    {
      id: "intent-action-1",
      verb: "add-item",
      entity: "asset",
      target: "savings",
      amount: 500,
      currency: "USD",
      raw: "Add $500 to savings",
    },
    {
      id: "intent-action-2",
      verb: "remove-item",
      entity: "liability",
      target: "debt",
      amount: null,
      currency: null,
      raw: "remove 100 from debt",
    },
  ],
  raw: "Add $500 to savings and remove 100 from debt",
});

vi.mock("@/lib/intent/parser", async () => {
  const actual = await vi.importActual<typeof import("@/lib/intent/parser")>(
    "@/lib/intent/parser"
  );
  return {
    ...actual,
    parseIntent: mockParseIntent,
  };
});

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
    expect(mockParseIntent).toHaveBeenCalledWith(
      "Add $500 to savings and remove 100 from debt"
    );
    const payload = await response.json();
    expect(payload.actions).toHaveLength(2);
    expect(payload.intentId).toBeDefined();
  });

  it("rejects invalid payloads", async () => {
    const response = await POST(buildRequest({}));
    expect(response.status).toBe(400);
  });
});
