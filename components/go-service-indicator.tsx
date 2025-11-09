"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

const proxyPrefix =
  process.env.NEXT_PUBLIC_GO_PROXY_PREFIX?.replace(/\/$/, "") ?? "/go-api";
const healthPath =
  process.env.NEXT_PUBLIC_GO_SERVICE_HEALTH ?? "/health";
const HEALTH_ENDPOINT = `${proxyPrefix}${
  healthPath.startsWith("/") ? healthPath : `/${healthPath}`
}`;

type Status = "checking" | "healthy" | "unhealthy";
const POLL_INTERVAL_MS = 10_000;

export function GoServiceIndicator() {
  if (process.env.NODE_ENV === "production") {
    return null;
  }

  const [status, setStatus] = useState<Status>("checking");
  const [details, setDetails] = useState<string>("Checking Go service…");
  const [lastCheckedAt, setLastCheckedAt] = useState<Date | null>(null);

  const checkHealth = useCallback(async () => {
    setStatus((previous) => (previous === "checking" ? previous : "checking"));
    try {
      const response = await fetch(HEALTH_ENDPOINT, {
        cache: "no-store",
      });
      setLastCheckedAt(new Date());
      if (!response.ok) {
        throw new Error(`Received status ${response.status}`);
      }
      const payload = await response.json().catch(() => ({}));
      if (payload?.status !== "ok") {
        throw new Error("Unexpected response payload");
      }
      setStatus("healthy");
      setDetails("Connected — API responding");
    } catch (error) {
      setStatus("unhealthy");
      setDetails(
        error instanceof Error ? error.message : "Unable to reach Go service",
      );
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    const tick = async () => {
      if (!mounted) return;
      await checkHealth();
    };

    tick();
    const interval = setInterval(tick, POLL_INTERVAL_MS);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [checkHealth]);

  const statusCopy = useMemo(() => {
    const base = {
      checking: {
        label: "Checking…",
        dotClass: "bg-amber-500 animate-pulse",
        hint: "Pinging the Go service proxy.",
      },
      healthy: {
        label: "Healthy",
        dotClass: "bg-emerald-500",
        hint: "Frontend is proxying requests successfully.",
      },
      unhealthy: {
        label: "Unreachable",
        dotClass: "bg-rose-500",
        hint: "Start the Go backend via `pnpm go:dev` or `pnpm dev:full`.",
      },
    };
    return base[status];
  }, [status]);

  const retry = useCallback(() => {
    void checkHealth();
  }, [checkHealth]);

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm rounded-lg border border-border bg-background/95 px-4 py-3 text-sm shadow-lg backdrop-blur">
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className={`mt-1 inline-flex h-2.5 w-2.5 rounded-full ${statusCopy.dotClass}`}
        />
        <div className="flex-1 space-y-1">
          <div className="flex items-center gap-2">
            <p className="font-medium">Go service</p>
            <span className="text-xs text-muted-foreground">
              {statusCopy.label}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">{details}</p>
          <p className="text-xs text-muted-foreground">{statusCopy.hint}</p>
          {lastCheckedAt ? (
            <p className="text-[0.65rem] uppercase tracking-wide text-muted-foreground">
              Last check: {lastCheckedAt.toLocaleTimeString()}
            </p>
          ) : null}
          <button
            type="button"
            onClick={retry}
            className="inline-flex items-center rounded-md border border-border px-2 py-1 text-xs font-medium text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Retry now
          </button>
        </div>
      </div>
    </div>
  );
}
