## AI Enhancements — Event Platform (Practical 2025)

Guardrails: human-in-the-loop, explainability, opt-in data use, PII minimization, evaluation harness.

### 1) AI Event Creator

- Inputs: category, city, date/time, language(s), vibe keywords.
- Outputs: title, description (Bahasa/EN), tags, schedule blocks, SEO, image prompts.
- Stack: small local model + cloud LLM; prompt templates; toxicity filter.

### 2) Smart Audiences & Budget Routing

- Build seed audience from attendees/followers; embed interests; lookalikes.
- Predict channel ROI (IG, TikTok, email) under budget; allocate daily.
- Integrations: Meta/TikTok APIs; privacy-safe aggregation.

### 3) Dynamic Pricing Guardrails

- Suggest price/discount windows; enforce floor/ceiling; simulate revenue.
- Features: demand velocity, inventory, lead time, competitor index.

### 4) Forecasting & Operations

- Attendance, no-show, ingress spikes, merch take-rate; staff scheduling hints.
- Cold-start fallback using category/city priors.

### 5) Conversational Search & Help

- Attendee search: “konser jazz besok Jakarta di bawah 200k” → ranked list.
- Organizer copilot: “buatkan tracking link untuk IG ads dan email blast”.
- RAG over docs/FAQ; actions with safe tools.

### 6) Safety & Moderation

- Listing/image moderation; fraud/risk scoring; anomaly detection (refund bursts).

### 7) Post‑event Summaries

- Email recap, highlights, auto video chapters; NPS insights and action items.

### 8) Evaluation

- Offline: relevance (nDCG), uplift simulations; Online: A/B by cohort; fairness checks.
