"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";

import { toast } from "@/components/toast";
import { useFinancialPlanningStore } from "@/features/financial-planning";

const GO_PROXY_PREFIX =
  process.env.NEXT_PUBLIC_GO_PROXY_PREFIX?.replace(/\/$/, "") || "/go-api";
const GO_SERVICE_BASE_URL =
  process.env.NEXT_PUBLIC_GO_SERVICE_BASE_URL?.replace(/\/$/, "") || null;
const STREAM_PATH = `${GO_PROXY_PREFIX}/events`;
const EVENT_TYPES = [
  "asset.create",
  "asset.update",
  "asset.delete",
  "liability.create",
  "liability.update",
  "liability.delete",
  "income.create",
  "income.update",
  "income.delete",
  "expense.create",
  "expense.update",
  "expense.delete",
] as const;

const RECONNECT_BASE_MS = 1000;
const REFRESH_DEBOUNCE_MS = 250;

export function useFinancialEvents() {
  const invalidate = useFinancialPlanningStore(
    (state) => state.invalidateFinancialData
  );
  const queryClient = useQueryClient();
  const sourceRef = useRef<EventSource | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);
  const refreshTimerRef = useRef<number | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const cursorRef = useRef<string | null>(null);
  const warnedRef = useRef(false);

  useEffect(() => {
    console.log("[financial-events] hook mounted");
    if (typeof window === "undefined" || typeof EventSource === "undefined") {
      return;
    }

    let disposed = false;

    const clearReconnectTimer = () => {
      if (reconnectTimerRef.current !== null) {
        window.clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
    };

    const clearRefreshTimer = () => {
      if (refreshTimerRef.current !== null) {
        window.clearTimeout(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
    };

    const cleanupSource = () => {
      if (!sourceRef.current) {
        return;
      }
      EVENT_TYPES.forEach((type) =>
        sourceRef.current?.removeEventListener(
          type,
          handleEvent as EventListener
        )
      );
      sourceRef.current.close();
      sourceRef.current = null;
    };

    const scheduleRefresh = () => {
      if (refreshTimerRef.current !== null) {
        return;
      }
      refreshTimerRef.current = window.setTimeout(() => {
        refreshTimerRef.current = null;
        invalidate();
      }, REFRESH_DEBOUNCE_MS);
    };

    const handleEvent = (event: MessageEvent<string>) => {
      console.log("handling event...");
      console.log(event, "event");
      cursorRef.current = event.lastEventId || cursorRef.current;
      const keys = ["assets", "liabilities", "incomes", "expenses"] as const;
      keys.forEach((key) => {
        queryClient.invalidateQueries({ queryKey: [key] });
        queryClient.refetchQueries({ queryKey: [key], type: "active" });
      });
      scheduleRefresh();
    };

    const scheduleReconnect = () => {
      if (disposed) {
        return;
      }
      clearReconnectTimer();
      const attempts = reconnectAttemptsRef.current + 1;
      reconnectAttemptsRef.current = attempts;
      const delay = Math.min(10_000, RECONNECT_BASE_MS * attempts);
      reconnectTimerRef.current = window.setTimeout(() => {
        reconnectTimerRef.current = null;
        connect();
      }, delay);
    };

    const connect = () => {
      cleanupSource();

      const url = GO_SERVICE_BASE_URL
        ? new URL(`${GO_SERVICE_BASE_URL}/events`)
        : new URL(STREAM_PATH, window.location.origin);
      if (cursorRef.current) {
        url.searchParams.set("cursor", cursorRef.current);
      }
      url.searchParams.set("session", "browser");

      const eventSource = new EventSource(url.toString());
      sourceRef.current = eventSource;

      EVENT_TYPES.forEach((type) =>
        eventSource.addEventListener(type, handleEvent as EventListener)
      );

      eventSource.onopen = () => {
        reconnectAttemptsRef.current = 0;
        warnedRef.current = false;
        console.info("[financial-events] stream connected");
      };

      eventSource.onerror = () => {
        cleanupSource();
        if (!warnedRef.current) {
          warnedRef.current = true;
          toast({
            type: "error",
            description:
              "Lost connection to live financial updates. Trying to reconnect…",
          });
        }
        scheduleReconnect();
      };
    };

    connect();

    return () => {
      disposed = true;
      clearReconnectTimer();
      clearRefreshTimer();
      cleanupSource();
    };
  }, [invalidate, queryClient]);
}
