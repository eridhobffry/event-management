## Service Blueprint — Event Platform (Indonesia-first)

Swimlanes: Attendee, Organizer, Venue/Partner, Support/Trust, Marketing, Finance, Platform/AI, Data.

### Pre‑event (Discovery → Consideration → Purchase)

- Attendee: Personalized feed → event page → ticket select → checkout → confirmation (QR, wallet, WA share).
- Organizer: Create event → set tickets/seatmap/timeslots → integrations (Meta/TikTok/Zoom) → tracking links → publish.
- Marketing: Smart audiences; ads placements on marketplace; email campaigns.
- Platform: Fraud/risk checks; SEO sitemaps; caching; rate limits.
- AI: Title/desc generator; image suggestions; forecast demand; budget routing.

### Event Week (Engagement → Logistics)

- Attendee: Reminders (24h/2h), Online Event Page (if virtual), directions map, support entry.
- Organizer: Door staff setup; device provisioning; at-door POS; staff roles and access.
- Platform: Check-in PWA sync; offline mode; heartbeat; incident alerts.
- AI: Ingress prediction; staff/counter allocation recommendation; anomaly detection (ticket scans vs capacity).

### Day-of (Entry → Experience)

- Attendee: QR scan; zone access; add-on sales; re-entry policy.
- Organizer: Live dashboards; re-assign gates; handle waitlist releases.
- Finance: Capture at-door payments; ledger entries; refund triggers.
- Support/Trust: Escalations; abuse reporting; content takedowns if needed.

### Post‑event (Follow‑up → Retention)

- Attendee: Survey, highlights, similar events, photos/video, refunds if any.
- Organizer: Payout schedule; settlement report; cohort analytics; repeat event template.
- Marketing: Retargeting; lookalikes; community growth.
- AI: Summarize feedback; forecast next event; pricing suggestions; audience clusters.

### Backstage (Data & Ops)

- Data: Event, Order, Ticket, Attendee, Check-in, Payout fact tables; event stream to warehouse; anonymized analytics.
- Security: PII encryption; key rotation; access logs; moderation queues.
- Reliability: SLOs (99.9% core paths), circuit breakers, chaos drills; DR plan.
