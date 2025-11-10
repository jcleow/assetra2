import { describe, expect, it, vi, afterEach } from "vitest";

vi.mock("server-only", () => ({}));

import { GET, POST } from "@/app/api/actions/route";
import * as queries from "@/lib/db/queries";

const buildRequest = (body: unknown) =>
  new Request("https://example.com/api/actions", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

describe("POST /api/actions", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("persists action events", async () => {
    const mockEvent = {
      id: "evt-1",
      intentId: "intent-1",
      verb: "add",
      entity: "asset",
      target: "stocks",
      amount: 5000,
      currency: "USD",
      payload: {},
      createdAt: new Date(),
      chatId: null,
      userId: null,
    };
    const spy = vi
      .spyOn(queries, "recordActionEvent")
      .mockResolvedValue(mockEvent as any);

    const response = await POST(
      buildRequest({
        intentId: "intent-1",
        action: {
          verb: "add",
          entity: "asset",
        },
      })
    );

    expect(response.status).toBe(200);
    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({ intentId: "intent-1" })
    );
  });

  it("rejects invalid payloads", async () => {
    const response = await POST(buildRequest({}));
    expect(response.status).toBe(400);
  });
});

describe("GET /api/actions", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns events", async () => {
    const spy = vi
      .spyOn(queries, "listActionEvents")
      .mockResolvedValue([{ id: "evt", intentId: "i" } as any]);

    const response = await GET(
      new Request("https://example.com/api/actions?chatId=abc&limit=10")
    );
    expect(response.status).toBe(200);
    expect(spy).toHaveBeenCalledWith({ chatId: "abc", limit: 10 });
  });
});
