# Go Service Integration Guide

This document explains how to use, document, and ship the standalone Go financial planner service that lives in this repo.

## 1. API surface & schemas

- The full OpenAPI description lives in [`docs/go-service.openapi.yaml`](./go-service.openapi.yaml).
- Import [`docs/go-service.postman_collection.json`](./go-service.postman_collection.json) into Postman (or Bruno/Insomnia) to exercise every CRUD route with sensible defaults.
- Each schema mirrors the structs under `internal/finance`, so backend + frontend stay in lockstep.

| Entity | Endpoint | Notes |
| --- | --- | --- |
| `Asset` | `/assets` | Standard CRUD; PATCH expects the full resource payload (same as Go validation). |
| `Liability` | `/liabilities` | Matches `Liability` struct naming (e.g., `interestRateApr`). |
| `Income` | `/cashflow/incomes` | Frequency enum: `weekly`, `biweekly`, `monthly`, `quarterly`, `yearly`. |
| `Expense` | `/cashflow/expenses` | Same shape as `Income` minus `startDate`. |
| Cash-flow snapshot | `/cashflow` | Returns `{ incomes, expenses, summary }` where summary is `monthlyIncome`, `monthlyExpenses`, `netMonthly`. |

## 2. Environment variables & deployment knobs

| Variable | Default | Description |
| --- | --- | --- |
| `SERVER_HOST` | `0.0.0.0` | Interface to bind when running the Go binary. |
| `SERVER_PORT` | `8080` | HTTP port for the Go service. |
| `APP_ENV` | `development` | Toggles log verbosity (debug adds call sites). |
| `LOG_LEVEL` | `info` | Accepts `debug`, `info`, `warn`, `error`. |
| `SHUTDOWN_TIMEOUT` | `10s` | Grace period for graceful shutdown. |
| `READ_HEADER_TIMEOUT` | `5s` | Mitigates slowloris-style attacks. |
| `GO_SERVICE_URL` | `http://127.0.0.1:8080` | Used by the Next.js proxy + client to reach the Go process. |
| `GO_SERVICE_HEALTH` | `/health` | Health-path consumed by the frontend indicator.

### Feature flags

| Variable | Description |
| --- | --- |
| `GO_SERVICE_MOCK_MODE` | (planned) When set to `true`, the Next.js aggregator (T5-BE) can bypass the Go backend and return fixtures. |

## 3. Sample requests

```bash
# 1) List assets
curl -s ${GO_SERVICE_URL:-http://127.0.0.1:8080}/assets | jq

# 2) Create an income stream
curl -s -X POST \
  -H "Content-Type: application/json" \
  -d '{"source":"Freelance","amount":850,"frequency":"monthly","startDate":"2024-01-01T00:00:00Z","category":"side_hustle"}' \
  ${GO_SERVICE_URL:-http://127.0.0.1:8080}/cashflow/incomes | jq

# 3) Fetch the consolidated cash-flow snapshot
curl -s ${GO_SERVICE_URL:-http://127.0.0.1:8080}/cashflow | jq '.summary'
```

> Tip: Export `GO_SERVICE_URL=http://localhost:8080` to reuse the same curl commands against Docker containers, dev tunnels, or staging.

## 4. Container + devcontainer workflows

### Build & run with Docker

The repo ships a dedicated Go-service Dockerfile (`Dockerfile.go-service`).

```bash
# Build
docker build -f Dockerfile.go-service -t assetra-go .

# Run (exposes port 8080 by default)
docker run --rm -p 8080:8080 assetra-go
```

### VS Code / Dev Container

`.devcontainer/devcontainer.json` provisions Go 1.22 + Node 20 + pnpm so contributors can open the repo in Codespaces or VS Code Dev Containers and immediately run:

```bash
pnpm install
pnpm dev:full    # launches Next.js + Go service
```

## 5. Versioning guidance

1. Every backwards-incompatible HTTP change requires a new minor version (`v1.1.0`, `v1.2.0`, …) tagged as `go-service/vX.Y.Z` in git.
2. Keep the OpenAPI file, README table, and Postman collection in sync within the same PR—CI jobs from T4-BE-TEST will guard drifts.
3. Consumers should pin to a specific git tag or Docker image digest so they are insulated from main-branch churn.
4. Add changelog entries (see `docs/CHANGELOG-go-service.md` when it exists) whenever you introduce new fields or routes.

Following the above keeps backend + frontend contracts explicit and makes it straightforward for other teams to adopt the Go service without spelunking through code.
