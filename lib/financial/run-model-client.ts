import type { Asset, Liability, NetWorthPoint } from "./types";

export interface RunModelRequestBody {
  assets: Array<
    Pick<
      Asset,
      | "id"
      | "name"
      | "category"
      | "currentValue"
      | "annualGrowthRate"
      | "notes"
      | "updatedAt"
    >
  >;
  liabilities: Array<
    Pick<
      Liability,
      | "id"
      | "name"
      | "category"
      | "currentBalance"
      | "interestRateApr"
      | "minimumPayment"
      | "notes"
      | "updatedAt"
    >
  >;
  monthlyIncome: number;
  monthlyExpenses: number;
  currentAge: number;
  retirementAge?: number;
  startYear?: number;
}

export interface RunModelResponseBody {
  netWorthTimeline: NetWorthPoint[];
  meta: {
    durationMs: number;
    assetCount: number;
    liabilityCount: number;
  };
}

export interface RunModelClientOptions {
  endpoint?: string;
  retries?: number;
  retryDelayMs?: number;
  fetchFn?: typeof fetch;
}

const defaultOptions: Required<
  Pick<RunModelClientOptions, "endpoint" | "retries" | "retryDelayMs">
> = {
  endpoint: "/api/runModel",
  retries: 2,
  retryDelayMs: 300,
};

const sleep = (ms: number) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

export async function requestRunModel(
  body: RunModelRequestBody,
  options: RunModelClientOptions = {}
): Promise<RunModelResponseBody> {
  const { endpoint, retries, retryDelayMs } = { ...defaultOptions, ...options };
  const fetchFn = options.fetchFn ?? fetch;

  let attempt = 0;
  let lastError: unknown;

  while (attempt <= retries) {
    try {
      const response = await fetchFn(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        if (response.status >= 500 && attempt < retries) {
          attempt += 1;
          await sleep(retryDelayMs * attempt);
          continue;
        }
        const text = await response.text();
        throw new Error(text || `runModel request failed (${response.status})`);
      }

      const payload = (await response.json()) as RunModelResponseBody;
      return payload;
    } catch (error) {
      lastError = error;
      if (attempt >= retries) {
        throw error;
      }
      attempt += 1;
      await sleep(retryDelayMs * attempt);
    }
  }

  throw lastError ?? new Error("runModel request failed");
}
