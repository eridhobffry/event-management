## Tech Stack Plan 2025 (Drizzle + Neon baseline)

### Frontend

- Next.js App Router (RSC), TypeScript, Tailwind or Shadcn UI; React Server Components; Edge runtime where viable.
- Data fetching: server actions + React Query for client needs; Suspense + streaming.
- SEO: metadata routes; sitemaps per city/category; OG image generation.

### Backend

- Route Handlers (Next) + lightweight server (edge/node). Background jobs via serverless cron or QStash.
- Payments (DE/EU): Stripe (cards, Apple/Google Pay, SEPA Debit, giropay, Sofort/Klarna Pay Now), PayPal; optional Adyen/Mollie if needed. Tap to Pay via Stripe on iOS/Android where supported. Webhooks with signature verification.
- Email/SMS/WA: Resend/Sendgrid; WhatsApp Business API provider.
- Media: UploadThing or S3; image optimization via Next/Image.

### Data & DB (current: Drizzle + Neon)

- Neon Postgres (primary). Drizzle ORM and migrations (keep ./src/db/schema consistent).
- Read replicas for analytics; CDC (Wal2JSON) -> queue -> warehouse (BigQuery or ClickHouse) for BI.
- Caching: Redis/Upstash for sessions, rate limits, personalization features, and check-in offline sync.

### Analytics & Tracking

- Server-side tagging endpoint; GA4 + PostHog; pixel manager for Meta/TikTok; tracking links service.
- Event schema: purchase, begin_checkout, view_item, share, follow, save, check_in.

### AI Platform

- Model gateway (OpenAI, local small LLM, embeddings). Vector store (pgvector on Neon) for RAG (docs + listings).
- Feature store: Redis or pg tables; batch training with scheduled jobs; A/B infra.

### Security & Compliance

- Auth: Stack Auth (as in repo) with roles/permissions; JWT with Super Admin flag; 2FA for organizers; email/phone verification.
- PII encryption at rest; secrets via environment manager; audit logs; content moderation pipeline.

### Release & Quality

- CI: typecheck, lint, test, build; preview deployments.
- Error monitoring: Sentry; logging: OpenTelemetry, structured logs; SLO dashboards.

### Performance Targets

- LCP ≤ 1.8s; P95 API ≤ 300ms; 99.9% uptime for checkout; offline-ready check-in.

### Migration Notes

- Map current `src/db/schema` to new features (ticket classes, orders, attendees, seating, check-ins, payouts). Use incremental migrations.
- Keep Event → TicketClass → Order → OrderItem → Attendee → Checkin tables normalized; add `tracking_links`, `pixels`, `collections`, `waitlists` tables.
