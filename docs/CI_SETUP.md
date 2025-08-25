# CI Setup Guide

This project runs unit tests (Vitest) and E2E tests (Playwright) in GitHub Actions. Use this guide to configure required services and secrets.

## Overview
- Web server: Playwright `webServer` starts `npm run dev` on `http://localhost:3050`.
- Database: Prefer `NEON_DATABASE_URL` secret; if missing, CI falls back to an internal Postgres service.
- Migrations + seed always run before E2E: `npm run db:push` then `npm run db:seed`.
- Retries: Playwright uses `retries = 2` when `CI` is true.

## Database configuration

### Option A: Neon (recommended for parity)
1. Create or use the existing Neon project.
2. Get the connection string (e.g. `postgresql://user:pass@host/db?sslmode=require`).
3. In GitHub: Settings → Secrets and variables → Actions → New repository secret.
   - Name: `NEON_DATABASE_URL`
   - Value: your Neon connection string

### Option B: CI Postgres service (fallback)
No secrets needed. The workflow provides a local Postgres service. If `NEON_DATABASE_URL` is not set, CI uses:
```
postgresql://postgres:postgres@localhost:5432/postgres
```

## Migrations and seeding
- CI runs:
  - `npm run db:push` (applies Drizzle migrations)
  - `npm run db:seed` (destructive seed of core data)
- Ensure `src/db/seed.ts` is idempotent/re-runnable.

## PayPal sandbox configuration (for E2E flows)
- Create a Sandbox Personal (buyer) account in the PayPal Developer Dashboard:
  - https://developer.paypal.com/dashboard/sandbox/accounts → Create → Type: Personal
- Required repository secrets:
  - `PAYPAL_CLIENT_ID`
  - `PAYPAL_SECRET`
  - `PAYPAL_ENV` (e.g. `sandbox`)
  - `PAYPAL_SANDBOX_BUYER_EMAIL` (email of the Personal sandbox buyer)
  - `PAYPAL_SANDBOX_BUYER_PASSWORD` (password of the buyer)

## Troubleshooting
- E2E fails early:
  - Check that the server started on `http://localhost:3050` (Playwright will handle startup, but see logs if it times out).
  - Verify DB prep ran (look for `db:push` and `db:seed` steps).
  - If using Neon, confirm `NEON_DATABASE_URL` is set and reachable from CI.
- Flaky E2E:
  - Retries are enabled on CI; inspect Playwright report artifacts for failure details.

## Files of interest
- Workflow: `.github/workflows/ci.yml`
- Playwright config: `playwright.config.ts`
- Seeds/migrations: `src/db/seed.ts`, `src/db/migrations/`
