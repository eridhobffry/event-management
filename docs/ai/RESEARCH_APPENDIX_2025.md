# Research Appendix 2025

Date: 2025-08-19
Owner: AI/Platform
Status: Supporting doc

## Source Drafts

- Version 1 — Future AGI‑Aligned Agentic AI Architecture
  - Themes: agent-first orchestration, EDA, human-in-loop safety, multi-agent (EIA/AIA/OIA/FIA/STA/DMA), hybrid local+cloud models, Indonesia-first multilingual support.
  - Implication: design for autonomy with strong governance and progressive capability growth.

- Version 2 — AI/AGI Development State & Architecture Alignment
  - Themes: production agent frameworks (LangGraph/CrewAI/AutoGen), compressed AGI timelines, multimodal maturity with limits, industry ROI, safety frameworks (NIST/SAIF/EU AI Act), strategic roadmap to 2030.
  - Implication: execution focus with proven stacks, observability, and governance; keep options open as capabilities scale.

## How this informs our plan

- Vision mapping: see `docs/ai/AI_ARCHITECTURE_VISION.md`
  - Principles (agent-first, safety, incremental delivery) come from V1+V2.
  - Phased timeline reflects V2’s production readiness + V1’s long-term autonomy.

- ADR-0001 decisions: see `docs/ai/ADR-0001-ai-platform-foundation.md`
  - MVP‑R (Recommendations) first: high value, low risk.
  - Vector store on Neon (`pgvector`) and provider-agnostic embeddings.
  - Governance: audit via `activity_logs`, opt-in personalization, kill switch.

- Next sprint backlog: see `docs/ai/NEXT_SPRINT_BACKLOG_MVP-R.md`
  - Tickets trace to concrete deliverables (schema, job, API, UI, telemetry).

## Out of scope (current sprint)
- Orchestration frameworks adoption (LangGraph/CrewAI) — planned for later.
- Financial autonomy (pricing actions) — human-in-loop required; defer until after recs.
- Heavy multimodal (video/spatial reasoning) — revisit once needed.

## Open questions for review
- Provider(s) for embeddings and moderation? Budget caps?
- Personalization consent UX copy and rollout markets?
- Minimum dataset size for initial recs backfill?

## References
- Internal: `docs/TECH_STACK_2025.md`, `src/db/schema/*`, `src/db/migrations/*`
- External (non-binding): NIST AI RMF, EU AI Act, LangGraph/CrewAI docs
