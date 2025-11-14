# spec

- always git checkout a new branch with the ticket name before working on it
- whenever a ticket is done, add a status: "done" to specs-phase-3.json
- push the branch and submit a PR for user to review
- PR should have the ticket details as description
- when there is a doubt on the task always ask

## Chat-driven CRUD context

- The chat composer (`components/chat.tsx`) tries to parse every user submission as a financial intent by calling `POST /api/intent` with the trimmed message. Successful responses are shown to the user for confirmation before dispatch.
- `/api/intent` calls `parseIntent` (`lib/intent/parser.ts`). The parser fetches the current plan snapshot from `/api/financial-plan?mock=true`, formats it into context, and invokes the LLM helper (`lib/intent/llm.ts`) which only emits verbs `add-item`, `update`, or `remove-item` for the entities `asset`, `liability`, `income`, and `expense`.
- Each intent action carries the normalized `target`, `amount`, and optional `currency`. When the user confirms, the chat UI invokes `dispatchIntentActions` (`features/financial-planning/intent-dispatcher.ts`) with the actions and current chat/intent ids.
- `dispatchIntentActions` clones the plan stored in `useFinancialPlanningStore`, persists each action through `financialClient` (e.g., `persistAsset`, `persistLiability`, etc.), mutates the local clone via `applyAction` / `create*FromIntent`, then recomputes summaries and cashflow via `recalcSummary` and `syncCashflowSummary`.
- After applying actions, the store is updated, projections are re-run, audit events are emitted, and `refreshData` pulls the latest plan from the backend. Because every dashboard widget reads from the same store, CRUD changes made in chat immediately reflect in the UI.
- When building future UI CRUD behavior, plug into this pipeline (intent parsing → dispatcher → store refresh) so chat and point-and-click surfaces stay consistent. If a new entity type or field is added, update the prompt/types plus the relevant `persist*` and `create*FromIntent` helpers before exposing it in chat.
- Property planner scenarios also participate in this flow via the `property-planner` entity. Supported planner commands include updating mortgage inputs (loan amount, tenure, rates, borrower type), renaming headlines, creating scenarios per property type, and clearing a scenario entirely. Always include planner keywords (e.g., "planner", "scenario", "mortgage planner") in user guidance so the parser can safely route these intents.
