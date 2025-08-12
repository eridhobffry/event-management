# 🚀 Current Sprint (Aug 12–18, 2025)

Derived from: `docs/FEATURES_BENCHMARK.md`, `docs/UI_UX_GUIDE_2025.md`, `docs/TECH_STACK_2025.md`, `docs/AI_ENHANCEMENTS.md`, `docs/SERVICE_BLUEPRINT.md`, `docs/CUSTOMER_JOURNEYS.md`.

## 🎯 Sprint Goal (MVP Small Wins)

- **Enable organizers to see attendee lists and export CSV**, finishing CRUD foundation.
- **Prepare Stripe test setup** to kick off paid ticketing next sprint.

## ✅ Definition of Done

- Attendee list visible under `Dashboard → Events → [event] → Attendees` with search, filter, export.
- Basic loading/empty/error states (mobile-first) aligned with `UI_UX_GUIDE_2025.md`.
- Tests/build green. Commit history small and scoped.

## 🗂 Scope and Tasks

### A) Attendee List (Owners)

- [x] Query attendees by `eventId` in `src/actions/attendees.ts` (initial `getEventAttendees`; pagination to add).
- [x] Add attendees page table `src/app/dashboard/events/[id]/attendees/page.tsx` using `data-table`.
- [x] Columns in `src/app/dashboard/events/[id]/attendees/columns.tsx` (name, email, createdAt, status).
- [x] Add search (by name/email) and filter (status) to table.
- [x] Add `export-button.tsx` to download CSV (client-side for now).
- [x] Wire nav link from event details to attendees page.
- [x] Empty/loading/error states consistent with design system.

### B) Minor UX polish (fast wins)

- [x] Show attendee count badge on `event-card.tsx` and desktop table.
- [x] Breadcrumbs and header consistency per dashboard pages.

### C) Stripe Test Prep (No UI yet)

- [x] Add `.env.local` placeholders for Stripe keys (documented in `README.md`).
- [x] Install Stripe SDK; scaffold `src/app/api/stripe/webhooks/route.ts` (signature verified via CLI; no business logic yet).
- [x] Document payment methods per `TECH_STACK_2025.md` and `CORE_CHALLENGE_PAYMENT.md` (linked from `README.md`).

## 🔬 QA Checklist

- [ ] Pagination works (10/25/50 per page) and persists sort/search.
- [ ] CSV export opens/save with correct headers and UTF-8.
- [ ] Mobile: table collapses to cards; desktops use table.
- [ ] AuthZ: only event owners/role can view/export.
- [ ] No PII in logs; no client secrets in client bundle.

## 📅 Suggested Timeline

- Day 1: Attendee query + table skeleton + navigation
- Day 2: Search/filter + CSV export
- Day 3: UX polish + QA + docs + commit

## 🧭 References

- `FEATURES_BENCHMARK.md` → MVP priorities (CRUD, exports, insights)
- `UI_UX_GUIDE_2025.md` → tables, mobile patterns
- `TECH_STACK_2025.md` → Drizzle + Neon, payments, analytics
- `SERVICE_BLUEPRINT.md` → ops flows (attendees, check-in)
- `CUSTOMER_JOURNEYS.md` → organizer needs

---

## 🧱 To-Do (Engineering Steps)

### 1) Data access

- [x] `src/actions/attendees.ts`: `listAttendeesByEventId(eventId, { q, status, page, pageSize })` implemented.

### 2) UI routes/components

- [x] `src/app/dashboard/events/[id]/attendees/page.tsx` rendering `DataTable` with server-fetched data.
- [x] `src/app/dashboard/events/[id]/attendees/columns.tsx` define columns.
- [x] `src/app/dashboard/events/[id]/attendees/export-button.tsx` (client-side CSV for now; server stream later).
- [x] Link from `src/app/dashboard/events/[id]/page.tsx` header to attendees.

### 3) Server API for CSV

- [x] `src/app/api/events/[id]/attendees/export/route.ts` streams CSV with correct headers and auth.

### 4) UX polish

- [x] Badge count in `src/app/dashboard/events/event-card.tsx` and table columns.
- [x] Empty/loading/error states; responsive cards.

### 5) Stripe prep

- [x] `npm install stripe` and add env keys placeholders.
- [x] Scaffold webhook route with signature verification in place (no business logic yet).
- [x] Add `docs/CORE_CHALLENGE_PAYMENT.md` link and setup steps to `README.md`.

### 6) Database alignment (Neon ↔ Drizzle)

- [x] Verified `public` and `neon_auth` schemas match Drizzle definitions (tables, columns, PKs, FKs, uniques, indexes)
- [x] Confirmed `events.expectations` exists as JSON with default [] and is used by UI
- [x] Confirmed FKs to `neon_auth.users_sync` exist: `activity_logs.user_id`, `attendees.user_id`, `events.created_by`, `user_roles.user_id`
- [x] Clean up duplicate migration file `src/db/migrations/0003_add_expectations_column.sql` (keep canonical `0003_glossy_smiling_tiger.sql`)
- [x] Ensure `.env.local` `NEON_DATABASE_URL` matches the active project endpoint used by the app

---

## 📦 Git Plan

Small atomic commits:

- feat(attendees): list action + pagination
- feat(attendees): table + search/filter
- feat(attendees): CSV export route/button
- chore(ux): attendee badges + empty/loading states
- chore(payments): stripe sdk + webhook scaffold (no logic)
- docs: update `docs/CURRENT_SPRINT.md` and `README.md`

Branch: `feat/attendees-list-export`

---

## ✅ Manual Test Plan (Attendees list, search/filter, pagination, CSV)

### Pre-req

- Organizer signed in; at least one event with 15+ attendees across both pending and checked-in statuses.

### Steps

1. Navigate to `Dashboard → Events → [event] → Attendees`.
   - Expect header shows event name, date, location and total attendees count.
2. Search by name/email (top filter form) and click Apply.
   - Expect results filtered; total count reflects filtered set.
3. Change Status to Pending, Apply; then Checked In, Apply.
   - Expect only matching status rows; badge/status column updates.
4. Pagination
   - With pageSize=25 default: ensure Previous is disabled on page 1; Next is enabled when more than 25; navigate Next then Previous keeps filters.
5. CSV Export
   - Click Export CSV; server route downloads file with correct headers and filtered results. Filename includes date. (Client CSV remains fallback.)
6. Empty state
   - Pick an event with zero attendees (or apply a search that returns none) and verify empty card + link to registration page.

### Troubleshooting (where to fix if a step fails)

- Data/filtering/pagination: `src/actions/attendees.ts` → `listAttendeesByEventId`
- Page UI/URL params wiring: `src/app/dashboard/events/[id]/attendees/page.tsx`
- Table rendering/columns: `src/app/dashboard/events/[id]/attendees/columns.tsx`
- CSV logic (client): `src/app/dashboard/events/[id]/attendees/export-button.tsx`
- CSV logic (server): `src/app/api/events/[id]/attendees/export/route.ts`
- Nav link from event page: `src/app/dashboard/events/[id]/page.tsx`
- Attendee schema/types: `src/db/schema/attendees.ts`
- Table component pagination toggle: `src/components/data-table.tsx`

Notes:

- Server pagination is authoritative; client table pagination is disabled via `hidePagination`.
- Search uses case-insensitive LIKE via SQL template `lower(name/email) like %q%`.
