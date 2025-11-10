"use client";

import { useEffect, useRef } from "react";

import { toast } from "@/components/toast";
import { useFinancialPlanningStore } from "@/features/financial-planning";

const GO_PROXY_PREFIX =
  process.env.NEXT_PUBLIC_GO_PROXY_PREFIX?.replace(/\/$/, "") || "/go-api";
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
  const sourceRef = useRef<EventSource | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);
  const refreshTimerRef = useRef<number | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const cursorRef = useRef<string | null>(null);
  const warnedRef = useRef(false);

  useEffect(() => {
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
      cursorRef.current = event.lastEventId || cursorRef.current;
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

      const url = new URL(STREAM_PATH, window.location.origin);
      if (cursorRef.current) {
        url.searchParams.set("cursor", cursorRef.current);
      }
      url.searchParams.set("session", "browser");

      const eventSource = new EventSource(url.toString(), {
        withCredentials: true,
      });
      sourceRef.current = eventSource;

      EVENT_TYPES.forEach((type) =>
        eventSource.addEventListener(type, handleEvent as EventListener)
      );

      eventSource.onopen = () => {
        reconnectAttemptsRef.current = 0;
        warnedRef.current = false;
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
  }, [invalidate]);
}
