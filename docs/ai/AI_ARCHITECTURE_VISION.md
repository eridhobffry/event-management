# AI Architecture Vision & Timeline (2025)

Date: 2025-08-19
Owner: AI/Platform
Status: Draft (for review)

## Purpose & Scope
A step-by-step, production-first path to agentic AI. Focus on 1–2 valuable capabilities, measurable outcomes, and safety. This document synthesizes prior research and aligns it to our stack (Next.js + Drizzle + Neon).

## Principles
- Agent-first, human-in-the-loop for high-risk actions
- Multi‑modal when needed; start with text and structured signals
- Privacy-by-design and auditability (PII minimization, consent)
- Incremental rollout with A/B tests and clear SLOs

## Agent Ecosystem (high level)
- Event Intelligence (EIA): content suggestions, trend cues
- Audience Intelligence (AIA): personalization, ranking
- Operations Intelligence (OIA): attendance/no‑show forecasts
- Financial Intelligence (FIA): pricing suggestions with guardrails
- Safety & Trust (STA): moderation, anomaly detection
- Discovery & Matching (DMA): recommendations and search

## Current State (fit‑gap snapshot)
- DB: Neon Postgres via Drizzle; ticketing tables present; `activity_logs` exists (`src/db/schema/activity_logs.ts`).
- Vector DB: Not enabled yet (pgvector missing on Neon).
- AI SDK: None yet in `package.json`.
- Queues/streams: None (no Redis/Upstash).
- Telemetry: No Sentry/OTel. PostHog/GA endpoints planned in `docs/TECH_STACK_2025.md`.

## MVP Tracks (choose one)
- MVP‑R (Recommendations): "You may also like" on event pages using embeddings + kNN.
  - Pros: high UX value, low product risk, clear CTR metric
  - Needs: pgvector on Neon; embeddings pipeline; retrieval API
- MVP‑C (Content Assist): Organizer description/prompts generation with moderation + A/B
  - Pros: speed to value; minimal infra
  - Needs: AI SDK + provider; moderation; variant logging

## Timeline (step-by-step)
- Now (Week 0–1)
  - Finalize this Vision and ADR-0001
  - Decide MVP track (MVP‑R or MVP‑C)
  - Baseline metrics (CTR or authoring time; latency; error budgets)
- MVP Build (Week 1–4)
  - MVP‑R: enable pgvector on Neon; add `event_embeddings` table; batch embed events; kNN API (`/api/recs`); UI block on `events/[id]`; log exposures/clicks in `activity_logs`
  - MVP‑C: add AI SDK + provider; moderation; server action for drafts; UI compose editor; log usage/outcomes
  - QA, load tests; launch to 10% traffic; A/B experiment enabled
- Near-term (Week 5–10)
  - Iterate on models/prompts; widen rollout; add guardrails dashboards
  - Add simple orchestrator (LangGraph/CrewAI optional) for 2‑agent flows
- 2025H2
  - Expand to OIA/FIA pilots (forecasts, pricing suggestions with human approval)
  - Begin event-driven jobs and reliability patterns (retries, DLQ)

## Deliverables
- APIs: retrieval or content endpoints
- UI: recs section or AI compose editor
- Data: embeddings/variants; `activity_logs` events
- Observability: dashboards for latency, errors, and biz KPIs

## Safety & Governance
- Human approval for pricing/financial decisions
- Content moderation and audit trails for AI outputs
- PII minimization; consent capture for personalization

## Metrics (MVP)
- MVP‑R: recs CTR uplift; session depth; conversion assist rate
- MVP‑C: authoring time saved; publish rate; quality ratings; incident rate
- System: P95 API latency; error rate; model cost per 1k users

## Decisions Needed
- Choose MVP track (R or C)
- Provider(s) and budget caps; moderation approach
- Approve pgvector enablement (if MVP‑R) or AI SDK addition (if MVP‑C)

## References
- Code: `src/db/schema/*`, `src/app/events/[id]/*`, `src/actions/*`
- Tech plan: `docs/TECH_STACK_2025.md`
