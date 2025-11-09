<a href="https://chat.vercel.ai/">
  <img alt="Next.js 14 and App Router-ready AI chatbot." src="app/(chat)/opengraph-image.png">
  <h1 align="center">Chat SDK</h1>
</a>

<p align="center">
    Chat SDK is a free, open-source template built with Next.js and the AI SDK that helps you quickly build powerful chatbot applications.
</p>

<p align="center">
  <a href="https://chat-sdk.dev"><strong>Read Docs</strong></a> ·
  <a href="#features"><strong>Features</strong></a> ·
  <a href="#model-providers"><strong>Model Providers</strong></a> ·
  <a href="#deploy-your-own"><strong>Deploy Your Own</strong></a> ·
  <a href="#running-locally"><strong>Running locally</strong></a>
</p>
<br/>

## Features

- [Next.js](https://nextjs.org) App Router
  - Advanced routing for seamless navigation and performance
  - React Server Components (RSCs) and Server Actions for server-side rendering and increased performance
- [AI SDK](https://ai-sdk.dev/docs/introduction)
  - Unified API for generating text, structured objects, and tool calls with LLMs
  - Hooks for building dynamic chat and generative user interfaces
  - Supports xAI (default), OpenAI, Fireworks, and other model providers
- [shadcn/ui](https://ui.shadcn.com)
  - Styling with [Tailwind CSS](https://tailwindcss.com)
  - Component primitives from [Radix UI](https://radix-ui.com) for accessibility and flexibility
- Data Persistence
  - [Neon Serverless Postgres](https://vercel.com/marketplace/neon) for saving chat history and user data
  - [Vercel Blob](https://vercel.com/storage/blob) for efficient file storage
- [Auth.js](https://authjs.dev)
  - Simple and secure authentication

## Model Providers

This template uses the [Vercel AI Gateway](https://vercel.com/docs/ai-gateway) to access multiple AI models through a unified interface. The default configuration includes [xAI](https://x.ai) models (`grok-2-vision-1212`, `grok-3-mini`) routed through the gateway.

### AI Gateway Authentication

**For Vercel deployments**: Authentication is handled automatically via OIDC tokens.

**For non-Vercel deployments**: You need to provide an AI Gateway API key by setting the `AI_GATEWAY_API_KEY` environment variable in your `.env.local` file.

With the [AI SDK](https://ai-sdk.dev/docs/introduction), you can also switch to direct LLM providers like [OpenAI](https://openai.com), [Anthropic](https://anthropic.com), [Cohere](https://cohere.com/), and [many more](https://ai-sdk.dev/providers/ai-sdk-providers) with just a few lines of code.

### Using providers directly

If you don't want to rely on the Vercel AI Gateway locally, set one of the following environment variables in `.env.local`:

- `GOOGLE_GENERATIVE_AI_API_KEY` to stream directly from Google Gemini models (`gemini-1.5-flash`, `gemini-1.5-pro`, etc.).
- `XAI_API_KEY` to talk to Grok directly.

When neither key is provided the app falls back to the AI Gateway and expects either the auto-injected OIDC token (on Vercel) or `AI_GATEWAY_API_KEY`. You can optionally override the concrete model IDs via `CHAT_MODEL_ID`, `REASONING_MODEL_ID`, `TITLE_MODEL_ID`, and `ARTIFACT_MODEL_ID`.

## Running locally

You will need to use the environment variables [defined in `.env.example`](.env.example) to run Next.js AI Chatbot. It's recommended you use [Vercel Environment Variables](https://vercel.com/docs/projects/environment-variables) for this, but a `.env` file is all that is necessary.

> Note: You should not commit your `.env` file or it will expose secrets that will allow others to control access to your various AI and authentication provider accounts.

1. Install Vercel CLI: `npm i -g vercel`
2. Link local instance with Vercel and GitHub accounts (creates `.vercel` directory): `vercel link`
3. Download your environment variables: `vercel env pull`

```bash
pnpm install
pnpm db:migrate # Setup database or apply latest database changes
pnpm dev
```

Your app template should now be running on [localhost:3000](http://localhost:3000).

## Go service (financial planner backend)

The standalone Go service powers financial planning data for the dashboard. It lives under `cmd/` and `internal/`.

### Configuration

| Variable | Default | Description |
| --- | --- | --- |
| `SERVER_HOST` | `0.0.0.0` | Host interface to bind. |
| `SERVER_PORT` | `8080` | Port for HTTP traffic. |
| `APP_ENV` | `development` | Used to toggle logging detail. |
| `LOG_LEVEL` | `info` | One of `debug`, `info`, `warn`, `error`. |
| `SHUTDOWN_TIMEOUT` | `10s` | Grace period for graceful shutdown. |
| `READ_HEADER_TIMEOUT` | `5s` | Protects the server from slowloris attacks. |

### Common commands

```bash
# Start the API locally
go run ./cmd/server

# From the repo root, helper targets are also available:
make run      # start the server
make lint     # golangci-lint run ./...
make fmt      # gofmt on tracked Go files
make test     # go test ./...
GOCACHE="$(pwd)/.gocache" GOMODCACHE="$(pwd)/.gomodcache" go test -race ./internal/finance ./internal/repository/memory
```

> `golangci-lint` must be installed locally (e.g., `brew install golangci-lint`). See the [official docs](https://golangci-lint.run/welcome/install/) for other platforms.

The `/health` endpoint returns a JSON payload with HTTP 200 when the service is healthy:

```bash
curl http://localhost:8080/health
```

To verify the binary builds on both macOS and Linux:

```bash
GOOS=darwin GOARCH=amd64 go build ./cmd/server       # macOS
GOOS=linux GOARCH=amd64 go build ./cmd/server        # Linux
```

### API docs & tooling

- **OpenAPI + Postman:** See [`docs/go-service.openapi.yaml`](docs/go-service.openapi.yaml) and [`docs/go-service.postman_collection.json`](docs/go-service.postman_collection.json) for an always-updated contract plus importable examples.
- **Integration guide:** [`docs/go-service-guide.md`](docs/go-service-guide.md) covers environment variables, sample `curl` calls, Docker + devcontainer workflows, and versioning expectations.
- **Docker:** Build and run the Go backend via `docker build -f Dockerfile.go-service -t assetra-go . && docker run --rm -p 8080:8080 assetra-go`.
- **Dev Container:** Opening the repo in VS Code Dev Containers (or Codespaces) uses `.devcontainer/devcontainer.json` to provision Go 1.22 + Node 20 + pnpm automatically.

### Frontend integration & proxying

- Set the following variables in `.env.local` (sample values live in `.env.example`):

  | Variable | Description |
  | --- | --- |
  | `GO_SERVICE_URL` | Base URL that Next.js rewrites to (defaults to `http://127.0.0.1:8080`). |
  | `GO_SERVICE_HEALTH` | Health-check path exposed by the Go API (defaults to `/health`). |

- The Next.js dev server proxies `/go-api/*` to the Go service, so the frontend can call `fetch("/go-api/health")` without CORS.
- Run both stacks together with one command: `pnpm dev:full`. This script spawns `pnpm dev` and `pnpm go:dev` in parallel and tears both down when either exits.
- If you prefer to start them manually, use:

  ```bash
  pnpm go:dev   # go run ./cmd/server
  pnpm dev      # next dev --turbo
  ```

- During development, a floating "Go service" indicator appears in the UI. It pings `/go-api${GO_SERVICE_HEALTH}` every 10 seconds and turns red (with retry guidance) when the proxyed API is unreachable. This immediately surfaces downtime or misconfigured environment variables.
- Need a quick sanity check before running Playwright? `pnpm dev:check` launches `pnpm dev:full`, ensures `/ping` and `/go-api/health` respond for a short window, and tears everything back down.

#### Troubleshooting

- Indicator shows “Unreachable”: ensure the Go binary is running locally (`pnpm go:dev`), the port matches `GO_SERVICE_URL`, and rerun `pnpm dev` after changing env vars.
- Verify the proxy manually with `curl http://localhost:3000/go-api/health`. You should see the same JSON payload as hitting the Go server directly.
- When the Go server URL changes, restart `pnpm dev` so Next.js reloads `GO_SERVICE_URL` and updates its rewrites.

### Financial domain primitives

- Core structs (`Asset`, `Liability`, `Income`, `Expense`) and helpers live under `internal/finance`. Use `finance.MonthlyCashFlow` to convert recurring incomes/expenses into net monthly numbers.
- Thread-safe, in-memory repositories are available via `internal/repository/memory`. The server seeds them with `finance.DefaultSeedData(time.Now().UTC())`, making it easy to swap storage backends later without touching handlers.

### REST API routes

All responses include an `X-Request-ID` header for tracing, and CORS is enabled for `GET/POST/PATCH/DELETE/OPTIONS` so the Next.js app can call the Go service through the `/go-api/*` proxy.

| Route | Methods | Description |
| --- | --- | --- |
| `/health` | `GET` | Basic readiness probe. |
| `/assets`, `/assets/{id}` | `GET`, `POST`, `PATCH`, `DELETE` | CRUD for asset records (name, category, value, growth rate, notes). |
| `/liabilities`, `/liabilities/{id}` | `GET`, `POST`, `PATCH`, `DELETE` | CRUD for liabilities including balances, APR, and minimum payments. |
| `/cashflow` | `GET` | Returns `{ incomes: Income[], expenses: Expense[], summary: MonthlyCashFlow }`. |
| `/cashflow/incomes`, `/cashflow/incomes/{id}` | `GET`, `POST`, `PATCH`, `DELETE` | CRUD for recurring income streams (source, amount, frequency, start date). |
| `/cashflow/expenses`, `/cashflow/expenses/{id}` | `GET`, `POST`, `PATCH`, `DELETE` | CRUD for recurring expenses. |

Example request:

```bash
curl -X POST http://localhost:8080/assets \
  -H 'Content-Type: application/json' \
  -d '{"name":"Brokerage","category":"investments","currentValue":25000,"annualGrowthRate":0.06}'
```

## Testing

| Command | Description |
| --- | --- |
| `pnpm test:unit` | Runs Vitest + Testing Library suites (e.g., the Go service indicator healthy/unhealthy states). |
| `pnpm test:e2e` | Runs Playwright. Automatically launches `pnpm dev:full`, so both Next.js and the Go API must bind locally. |
| `pnpm test` | Executes unit tests first, then Playwright for full regression coverage. |
# assetra2
