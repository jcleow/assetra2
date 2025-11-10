import { z } from "zod";

import {
  type Asset,
  type AssetCreatePayload,
  type AssetUpdatePayload,
  assetSchema,
  type CashFlowSnapshot,
  cashFlowSnapshotSchema,
  type Expense,
  type ExpenseCreatePayload,
  type ExpenseUpdatePayload,
  expenseSchema,
  type Income,
  type IncomeCreatePayload,
  type IncomeUpdatePayload,
  incomeSchema,
  type Liability,
  type LiabilityCreatePayload,
  type LiabilityUpdatePayload,
  liabilitySchema,
} from "./types";

export type FetchLike = (
  input: RequestInfo | URL,
  init?: RequestInit
) => Promise<Response>;

export interface FinancialClientOptions {
  baseUrl?: string;
  defaultHeaders?: Record<string, string>;
  fetchFn?: FetchLike;
}

export interface ResourceClient<
  TEntity extends { id: string },
  TCreate extends Partial<TEntity> & { id?: string },
  TUpdate extends Partial<TEntity> & { id: string },
> {
  list(signal?: AbortSignal): Promise<TEntity[]>;
  get(id: string, signal?: AbortSignal): Promise<TEntity>;
  create(payload: TCreate, signal?: AbortSignal): Promise<TEntity>;
  update(payload: TUpdate, signal?: AbortSignal): Promise<TEntity>;
  delete(id: string, signal?: AbortSignal): Promise<void>;
}

const DEFAULT_BASE_URL =
  process.env.NEXT_PUBLIC_GO_PROXY_PREFIX?.trim() || "/go-api";

export class FinancialClientError extends Error {
  status: number;
  details?: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = "FinancialClientError";
    this.status = status;
    this.details = details;
  }
}

export class FinancialClient {
  private readonly baseUrl: string;
  private readonly fetchFn: FetchLike;
  private readonly defaultHeaders: Record<string, string>;

  constructor(options: FinancialClientOptions = {}) {
    this.baseUrl = options.baseUrl ?? DEFAULT_BASE_URL;
    this.fetchFn = options.fetchFn ?? fetch.bind(globalThis);
    this.defaultHeaders = {
      Accept: "application/json",
      ...options.defaultHeaders,
    };
  }

  assets = this.createResourceClient<
    Asset,
    AssetCreatePayload,
    AssetUpdatePayload
  >("assets", assetSchema);
  liabilities = this.createResourceClient<
    Liability,
    LiabilityCreatePayload,
    LiabilityUpdatePayload
  >("liabilities", liabilitySchema);
  incomes = this.createResourceClient<
    Income,
    IncomeCreatePayload,
    IncomeUpdatePayload
  >("cashflow/incomes", incomeSchema);
  expenses = this.createResourceClient<
    Expense,
    ExpenseCreatePayload,
    ExpenseUpdatePayload
  >("cashflow/expenses", expenseSchema);

  cashflowSummary(signal?: AbortSignal) {
    return this.request<CashFlowSnapshot>("/cashflow", cashFlowSnapshotSchema, {
      method: "GET",
      signal,
    });
  }

  private createResourceClient<
    TEntity extends { id: string },
    TCreate extends Partial<TEntity> & { id?: string },
    TUpdate extends Partial<TEntity> & { id: string },
  >(resourcePath: string, schema: z.ZodType<TEntity>) {
    const collectionSchema = z.array(schema);
    const normalizedPath = resourcePath.startsWith("/")
      ? resourcePath
      : `/${resourcePath}`;
    const buildPath = (id?: string) =>
      id ? `${normalizedPath}/${encodeURIComponent(id)}` : normalizedPath;

    return {
      list: (signal?: AbortSignal) =>
        this.request<TEntity[]>(buildPath(), collectionSchema, {
          method: "GET",
          signal,
        }),
      get: (id: string, signal?: AbortSignal) =>
        this.request<TEntity>(buildPath(id), schema, {
          method: "GET",
          signal,
        }),
      create: (payload: TCreate, signal?: AbortSignal) =>
        this.request<TEntity>(buildPath(), schema, {
          method: "POST",
          body: JSON.stringify(payload),
          signal,
        }),
      update: (payload: TUpdate, signal?: AbortSignal) =>
        this.request<TEntity>(buildPath(payload.id), schema, {
          method: "PATCH",
          body: JSON.stringify(payload),
          signal,
        }),
      delete: async (id: string, signal?: AbortSignal) => {
        await this.send(buildPath(id), {
          method: "DELETE",
          signal,
        });
      },
    };
  }

  private resolveUrl(path: string) {
    if (/^https?:\/\//i.test(path)) {
      return path;
    }
    const trimmedBase = this.baseUrl.endsWith("/")
      ? this.baseUrl.slice(0, -1)
      : this.baseUrl;
    const trimmedPath = path.startsWith("/") ? path : `/${path}`;
    return `${trimmedBase}${trimmedPath}`;
  }

  private async request<T>(
    path: string,
    schema: z.ZodType<T>,
    init: RequestInit
  ): Promise<T> {
    const response = await this.send(path, init);
    const text = await response.text();
    const payload = text ? JSON.parse(text) : null;
    return schema.parse(payload);
  }

  private async send(path: string, init: RequestInit): Promise<Response> {
    const url = this.resolveUrl(path);
    const hasBody = init.body !== undefined;
    const headers = new Headers(this.defaultHeaders);
    if (init.headers) {
      const extra = new Headers(init.headers);
      extra.forEach((value, key) => headers.set(key, value));
    }

    if (hasBody && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }

    const response = await this.fetchFn(url, { ...init, headers });

    if (!response.ok) {
      let details: unknown;
      try {
        details = await response.clone().json();
      } catch {
        details = await response.text();
      }
      throw new FinancialClientError(
        `Request to ${url} failed with status ${response.status}`,
        response.status,
        details
      );
    }

    return response;
  }
}

// Export a default instance
export const financialClient = new FinancialClient();
