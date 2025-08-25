# ADR-0001: AI Platform Foundation & MVP Selection

Date: 2025-08-19
Status: Proposed
Owner: AI/Platform

## Context
- Research inputs: two drafts outlining agentic/AGI-aligned architectures (multi-agent orchestration, safety, vector retrieval, governance). Production trends highlight LangGraph/CrewAI/AutoGen maturity and pgvector adoption.
- Current stack: Next.js + Drizzle + Neon (project: small-mountain-10367610). `activity_logs` table exists. No AI SDK, no `pgvector`, no queues/Redis, no Sentry yet. See `docs/TECH_STACK_2025.md` calling for pgvector + model gateway.
- Goal: ship a narrow, measurable MVP in ≤4 weeks, with clear safety and observability.

## Decision
Adopt MVP‑R (Recommendations) as the first capability.
- Vector store: Neon Postgres with `pgvector`.
- Embeddings: provider-agnostic via a small gateway (e.g., Vercel AI SDK/OpenAI-compatible). Configure via env.
- Retrieval: kNN search over event embeddings. Server route handler + UI block on event pages.
- Safety & governance: opt-in personalization, non-PII inputs, audit via `activity_logs`, A/B rollout, manual kill switch.

Rationale
- High UX impact with low operational risk. Minimal coupling to payments/finance. Clear metrics (CTR, conversion assist).

## Alternatives
- MVP‑C (Content Assist): faster to start but requires moderation and editor UX; keep as Track 2.

## Architecture (Phase 1)
- Data: `event_embeddings(event_id, embedding, metadata, created_at)`
- Pipeline: batch embed existing events; incremental on create/update.
- Retrieval API: `/api/events/[id]/recs?limit=K` -> similar items from vector search + heuristics.
- UI: "You may also like" component on `events/[id]` page.
- Telemetry: exposure and click events into `activity_logs` + analytics.

## Implementation Plan
1) Database
- Enable `pgvector` extension on Neon.
- Create `event_embeddings` table; index strategy for ANN as needed later.

2) Embedding Job
- Script/server action to (a) fetch events, (b) build text for embedding (title, category, city, short desc), (c) call embedding provider, (d) upsert rows.
- Idempotent; supports partial re-embed.

3) Retrieval API
- Route handler: given `event_id`, return top K similar events excluding self, filter by availability/active.
- Fallback: popular/similar category if no vectors.

4) UI Integration
- Add a section to `src/app/events/[id]/page.tsx` with a small card grid; lazy load via Suspense.

5) Telemetry & Safety
- Log `recs_exposed` and `recs_click` to `activity_logs` with minimal metadata.
- Feature flag + A/B (10% → 50% → 100%). Kill switch env var.

## Timeline
- Week 0–1: Enable pgvector; create schema; embed 500–1k seed events; ship API behind flag.
- Week 2: UI integration on event page; exposure/click logging; QA.
- Week 3: A/B at 10%; evaluate CTR/latency; tuning (filters/prompts).
- Week 4: Ramp to 50–100% if metrics pass; write post-mortem + playback.

## Metrics (acceptance)
- CTR uplift vs control ≥ +10% at p<0.05
- API P95 ≤ 250 ms from cache, ≤ 500 ms cold
- Error rate < 1%; cost per 1k recs within budget

## Risks & Mitigations
- Cold start (no vectors): fallback to popular-in-category
- Cost spikes: caching; daily/weekly embedding batches
- Privacy: non-PII inputs; opt-in personalization
- Relevance drift: periodic re-embeddings; add recency boost

## Follow‑ups
- Track 2 (Content Assist): add model gateway & moderation pipeline
- Observability: add Sentry + structured logs
- Event-driven infra: introduce queue for background jobs when needed
