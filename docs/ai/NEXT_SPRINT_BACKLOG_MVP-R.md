# Next Sprint Backlog — MVP‑R (Recommendations)

Date: 2025-08-19
Owner: AI/Platform
Status: Planned (not in current sprint)

## Epic
Deliver “You may also like” recommendations on event detail pages using vector similarity, shipped behind a flag with audit logging.

## Tickets

1) Platform: Enable pgvector on Neon
- Type: Platform
- Description: Enable the `pgvector` extension on Neon project `small-mountain-10367610` and verify availability.
- Acceptance Criteria:
  - `pg_extension` lists `vector`
  - Connection string unchanged and compatible
- Notes: No app code changes this ticket

2) DB Schema: event_embeddings table
- Type: Backend / DB
- Description: Create `event_embeddings` with columns: `event_id` (FK), `embedding` (vector), `metadata` (jsonb), `created_at`.
- Acceptance Criteria:
  - Drizzle schema file in `src/db/schema/`
  - Migration generated in `src/db/migrations/`
  - Basic index created; can evolve to ANN later
- DoD: Drizzle `db:generate` passes; `db:push` works in dev

3) Batch Embedding Job (seed existing events)
- Type: Backend job
- Description: Script/server action to read events (title, categories, city, short description), call embedding provider, upsert into `event_embeddings`.
- Acceptance Criteria:
  - Idempotent reruns
  - Chunking + backoff; provider key via env
  - Logs success/fail counts
- DoD: Dry-run mode; sample of 50 events embedded locally

4) Incremental Embedding Hook (on create/update)
- Type: Backend
- Description: On event create/update, (re)embed and upsert `event_embeddings` row.
- Acceptance Criteria:
  - Retries on transient errors
  - Rate limited; backgrounded if slow
- DoD: Unit test for update path

5) Retrieval API: similar events
- Type: Backend / API
- Description: Route handler `/api/events/[id]/recs?limit=K` returning top‑K similar events excluding self, filtered to active/available.
- Acceptance Criteria:
  - Returns stable shape `{ items: [{ id, title, city, imageUrl, score }] }`
  - Fallback to popular-in-category when no vectors
  - P95 latency ≤ 500 ms cold

6) UI: Recs section on event detail
- Type: Frontend
- Description: Add “You may also like” card grid to `src/app/events/[id]/page.tsx` (lazy load via Suspense).
- Acceptance Criteria:
  - Displays up to K items; skeleton loading
  - Responsive layout; a11y focus order

7) Telemetry: exposure + click logging
- Type: Backend/Frontend
- Description: Log `recs_exposed` and `recs_click` to `activity_logs` with minimal, non‑PII metadata.
- Acceptance Criteria:
  - Contains `event_id`, `target_event_id`, `position`, `variant`
  - Verified in DB during QA

8) Feature Flag & Kill Switch
- Type: Platform
- Description: Env flag to enable/disable recs; progressive rollout 10% → 50% → 100%.
- Acceptance Criteria:
  - Flag off shows no network calls or UI
  - Flag can be toggled at runtime (next restart acceptable)

9) Observability
- Type: Platform
- Description: Add basic error reporting and structured logs for API and job.
- Acceptance Criteria:
  - Error capture path (Sentry or placeholder logger)
  - Logs include correlationId for request chaining

10) Docs & Runbook
- Type: Docs
- Description: Update `docs/ai/` with runbook for embeddings job, API usage, and rollback steps.
- Acceptance Criteria:
  - Runbook includes: deploy steps, backfill procedure, kill switch, rollback

## Dependencies
- 1 → 2 → 3/4 → 5 → 6/7
- 8 is horizontal; 9 and 10 parallel to 5–7

## Success Metrics
- CTR uplift vs control ≥ +10%
- P95 API latency ≤ 500 ms cold
- Errors < 1%; cost within budget

## Out of Scope (this sprint)
- Multi-agent orchestration
- Dynamic pricing suggestions
- Cross-modal recommendations
