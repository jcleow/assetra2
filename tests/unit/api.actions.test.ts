import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { GET, POST } from "@/app/api/actions/route";
import * as queries from "@/lib/db/queries";

const buildPostRequest = (body: unknown) =>
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
      buildPostRequest({
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
    const response = await POST(buildPostRequest({}));
    expect(response.status).toBe(400);
  });

  it("surfaces persistence failures", async () => {
    vi.spyOn(queries, "recordActionEvent").mockRejectedValue(
      new Error("db down")
    );

    const response = await POST(
      buildPostRequest({
        intentId: "intent-error",
        action: {
          verb: "add",
          entity: "asset",
        },
      })
    );
    expect(response.status).toBe(500);
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

  it("validates limit parameter", async () => {
    const response = await GET(
      new Request("https://example.com/api/actions?limit=abc")
    );
    expect(response.status).toBe(400);
  });

  it("handles list failures", async () => {
    vi.spyOn(queries, "listActionEvents").mockRejectedValue(new Error("boom"));

    const response = await GET(new Request("https://example.com/api/actions"));
    expect(response.status).toBe(500);
  });
});
