import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { GoServiceIndicator } from "@/components/go-service-indicator";

const HEALTHY_RESPONSE = {
  ok: true,
  status: 200,
  json: () => Promise.resolve({ status: "ok" }),
} as Response;

describe("GoServiceIndicator", () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_GO_PROXY_PREFIX = "/go-api";
    process.env.NEXT_PUBLIC_GO_SERVICE_HEALTH = "/health";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test("renders healthy state when the proxy responds", async () => {
    const fetchMock = vi.fn().mockResolvedValue(HEALTHY_RESPONSE);
    vi.stubGlobal("fetch", fetchMock);

    render(<GoServiceIndicator />);

    expect(
      await screen.findByText(/Connected — API responding/i)
    ).toBeVisible();
    expect(screen.getByText(/Healthy/i)).toBeVisible();
    expect(fetchMock).toHaveBeenCalledWith("/go-api/health", {
      cache: "no-store",
    });
  });

  test("shows failure details when the Go service is unreachable", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("ECONNREFUSED"));
    vi.stubGlobal("fetch", fetchMock);

    render(<GoServiceIndicator />);

    expect(await screen.findByText(/Unreachable/i)).toBeVisible();
    expect(
      screen.getByText(/ECONNREFUSED|Unable to reach Go service/)
    ).toBeVisible();
  });

  test("retry button rechecks the proxy health", async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce(HEALTHY_RESPONSE);
    vi.stubGlobal("fetch", fetchMock);

    render(<GoServiceIndicator />);

    expect(await screen.findByText(/Unreachable/i)).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: /retry now/i }));

    expect(
      await screen.findByText(/Connected — API responding/i)
    ).toBeVisible();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
