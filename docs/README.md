## Documentation Index

- FEATURES_BENCHMARK.md — Eventbrite × Rausgegangen feature map, MVP → Phase 2, with sources
- UI_UX_GUIDE_2025.md — UI/UX patterns for attendees, organizers, check‑in, and discovery
- SERVICE_BLUEPRINT.md — End‑to‑end service blueprint (pre‑event → post‑event)
- CUSTOMER_JOURNEYS.md — Journey maps for attendee/organizer/staff
- AI_ENHANCEMENTS.md — Practical AI features and evaluation plan
- TECH_STACK_2025.md — Stack plan around Next.js + Drizzle + Neon, payments, analytics, AI

### Updates

- Landing page hero: single primary CTA to discovery, social proof strip, mobile-first layout with visible focus states.
- Testing
  - Unit: `npm run test:unit` (Vitest)
  - E2E: `npm run e2e` (Playwright; auto-starts dev server)
- Event discovery: added city/date/category filters and improved empty states with quick clear actions. See tests `tests/events-discovery.test.ts` and `e2e/events-discovery.spec.ts`.

#### Update — 2025-08-21T16:48:04+02:00

- Mock DB (`src/lib/db.ts`): Investigated adding where-filtering to `db.query.*` methods; reverted to minimal behavior (ignore `where`/`orderBy`) to keep tests stable. Fixed a duplicate property and silenced an unused param lint in mock delete.
- Status: Branch is merge-ready.
- Next: Merge to `master` and pick up the next task. Optional: implement proper where filtering in mock DB for select/update/delete when needed.

#### Payments & Tickets (current)

- Stripe webhook issues tickets on payment success, emails QR codes (data URLs), and includes fallback links to secure check-in API at `/api/tickets/check-in`.
- Check-in API requires authenticated organizer/staff and toggles check-in state.
- Seed: `npm run db:seed` resets ticketing tables and adds realistic sample ticket types.

Next steps:
- Scanner UI: Minimal organizer page to paste/scan token and call `/api/tickets/check-in` with visual feedback.
- PayPal parity: Capture flow to mark orders paid, issue tickets, and send the same QR email.
- Tests: Unit/integration for webhook idempotency (email only on ticket creation) and check-in token toggle behavior.
