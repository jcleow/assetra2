#!/usr/bin/env node
const { spawn } = require("node:child_process");
const { setTimeout: delay } = require("node:timers/promises");

const pnpmCommand = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const nextPort = Number(process.env.PORT || 3000);
const proxyPrefix = process.env.NEXT_PUBLIC_GO_PROXY_PREFIX || "/go-api";
const healthPath = process.env.GO_SERVICE_HEALTH || "/health";
const healthEndpoint = `http://localhost:${nextPort}${proxyPrefix}${
  healthPath.startsWith("/") ? healthPath : `/${healthPath}`
}`;

async function waitForEndpoint(url, label, timeoutMs = 90_000) {
  const start = Date.now();
  const interval = 2_000;

  while (Date.now() - start < timeoutMs) {
    try {
      const response = await fetch(url, { cache: "no-store" });
      if (response.ok) {
        return response;
      }
    } catch {
      // swallow and retry
    }

    await delay(interval);
  }

  throw new Error(`Timed out waiting for ${label} at ${url}`);
}

async function assertProxyHealthy() {
  const response = await waitForEndpoint(
    healthEndpoint,
    "Go service via proxy"
  );
  const payload = await response.json().catch(() => ({}));
  if (payload.status !== "ok") {
    throw new Error(
      `Unexpected proxy response payload: ${JSON.stringify(payload)}`
    );
  }
}

async function main() {
  console.log("[dev:check] starting pnpm dev:full …");
  const child = spawn(pnpmCommand, ["dev:full"], {
    env: process.env,
    stdio: "inherit",
  });

  let shuttingDown = false;

  const exitPromise = new Promise((resolve, reject) => {
    child.once("exit", (code, signal) => {
      if (!shuttingDown) {
        reject(new Error(`dev:full exited early (code: ${code}, signal: ${signal ?? "none"})`));
        return;
      }
      resolve({ code, signal });
    });
  });

  try {
    await waitForEndpoint(`http://localhost:${nextPort}/ping`, "Next.js dev server");
    await assertProxyHealthy();

    console.log("[dev:check] both servers healthy, observing for 5s …");
    await delay(5_000);

    shuttingDown = true;
    child.kill("SIGINT");
    await exitPromise;
    console.log("[dev:check] success — both services booted and stayed healthy.");
    process.exit(0);
  } catch (error) {
    console.error(`[dev:check] ${error instanceof Error ? error.message : error}`);
    shuttingDown = true;
    child.kill("SIGINT");
    try {
      await exitPromise;
    } catch {
      // ignore — already failing
    }
    process.exit(1);
  }
}

if (typeof fetch !== "function") {
  console.error(
    "[dev:check] fetch is unavailable in this Node runtime. Please upgrade to Node 18+."
  );
  process.exit(1);
}

main();
