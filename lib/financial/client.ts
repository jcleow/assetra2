import { z } from "zod";

import {
  assetSchema,
  type Asset,
  type AssetCreatePayload,
  type AssetUpdatePayload,
  expenseSchema,
  type Expense,
  type ExpenseCreatePayload,
  type ExpenseUpdatePayload,
  incomeSchema,
  type Income,
  type IncomeCreatePayload,
  type IncomeUpdatePayload,
  liabilitySchema,
  type Liability,
  type LiabilityCreatePayload,
  type LiabilityUpdatePayload,
} from "./types";

export type FetchLike = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

export interface FinancialClientOptions {
  baseUrl?: string;
  defaultHeaders?: Record<string, string>;
  fetchFn?: FetchLike;
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
    this.fetchFn = options.fetchFn ?? fetch;
    this.defaultHeaders = {
      Accept: "application/json",
      ...options.defaultHeaders,
    };
  }

  assets = this.createResourceClient<Asset, AssetCreatePayload, AssetUpdatePayload>(
    "assets",
    assetSchema,
  );
  liabilities = this.createResourceClient<
    Liability,
    LiabilityCreatePayload,
    LiabilityUpdatePayload
  >("liabilities", liabilitySchema);
  incomes = this.createResourceClient<
    Income,
    IncomeCreatePayload,
    IncomeUpdatePayload
  >("incomes", incomeSchema);
  expenses = this.createResourceClient<
    Expense,
    ExpenseCreatePayload,
    ExpenseUpdatePayload
  >("expenses", expenseSchema);

  private createResourceClient<
    TEntity extends { id: string },
    TCreate extends { id?: string },
    TUpdate extends { id: string },
  >(resource: string, schema: z.ZodType<TEntity>) {
    const collectionSchema = z.array(schema);

    return {
      list: (signal?: AbortSignal) =>
        this.request<TEntity[]>(`/${resource}`, collectionSchema, {
          method: "GET",
          signal,
        }),
      get: (id: string, signal?: AbortSignal) =>
        this.request<TEntity>(`/${resource}/${encodeURIComponent(id)}`, schema, {
          method: "GET",
          signal,
        }),
      create: (payload: TCreate, signal?: AbortSignal) =>
        this.request<TEntity>(`/${resource}`, schema, {
          method: "POST",
          body: JSON.stringify(payload),
          signal,
        }),
      update: (payload: TUpdate, signal?: AbortSignal) =>
        this.request<TEntity>(
          `/${resource}/${encodeURIComponent(payload.id)}`,
          schema,
          {
            method: "PUT",
            body: JSON.stringify(payload),
            signal,
          },
        ),
      delete: (id: string, signal?: AbortSignal) =>
        this.send(`/${resource}/${encodeURIComponent(id)}`, {
          method: "DELETE",
          signal,
        }),
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
    init: RequestInit,
  ): Promise<T> {
    const response = await this.send(path, init);
    const text = await response.text();
    const payload = text ? JSON.parse(text) : null;
    return schema.parse(payload);
  }

  private async send(path: string, init: RequestInit): Promise<Response> {
    const url = this.resolveUrl(path);
    const hasBody = init.body !== undefined;
    const headers = {
      ...this.defaultHeaders,
      ...(init.headers ?? {}),
    };

    if (hasBody && !("Content-Type" in headers)) {
      headers["Content-Type"] = "application/json";
    }

    const response = await this.fetchFn(url, {
      ...init,
      headers,
    });

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
        details,
      );
    }

    return response;
  }
}
