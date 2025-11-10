import { describe, expect, it } from "vitest";

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
