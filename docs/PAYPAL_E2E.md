# PayPal Sandbox E2E Guide

This project includes an end-to-end (E2E) test that covers a full PayPal checkout flow using the PayPal Sandbox.

The test is located at `e2e/paypal-purchase.spec.ts` and is designed to be robust across local and CI environments.

## Requirements

- PayPal Sandbox Business app credentials
  - `PAYPAL_CLIENT_ID`
  - `PAYPAL_SECRET`
  - `PAYPAL_ENV=sandbox`
- PayPal Sandbox Buyer test account
  - `PAYPAL_SANDBOX_BUYER_EMAIL`
  - `PAYPAL_SANDBOX_BUYER_PASSWORD`
- Database
  - `NEON_DATABASE_URL` (Postgres connection string)

Optional:
- `E2E_EVENT_ID` to force a specific event ID (otherwise the test auto-discovers an event via the UI).

Notes:
- `playwright.config.ts` starts the dev server on port 3050 and sets `NEXT_PUBLIC_APP_URL=http://localhost:3050` for redirects.
- The seed script adds an event named "React Conference 2025", which the test looks for if `E2E_EVENT_ID` isn’t set.

## Running locally

1) Export environment variables:

```bash
export PAYPAL_CLIENT_ID=... \
  PAYPAL_SECRET=... \
  PAYPAL_ENV=sandbox \
  PAYPAL_SANDBOX_BUYER_EMAIL=... \
  PAYPAL_SANDBOX_BUYER_PASSWORD=... \
  NEON_DATABASE_URL=postgres://...
```

2) Install and prepare:

```bash
npm ci
npm run db:push
npm run db:seed
```

3) Run the E2E test:

```bash
npx playwright test e2e/paypal-purchase.spec.ts --project=chromium
```

You can also run the iPhone profile:

```bash
npx playwright test e2e/paypal-purchase.spec.ts --project=iphone-12
```

4) View the report (after a run):

```bash
npx playwright show-report
```

## CI setup (GitHub Actions)

Add these repository secrets (Settings → Secrets and variables → Actions):
- `PAYPAL_CLIENT_ID`
- `PAYPAL_SECRET`
- `PAYPAL_ENV` (value: `sandbox`)
- `NEON_DATABASE_URL`
- `PAYPAL_SANDBOX_BUYER_EMAIL`
- `PAYPAL_SANDBOX_BUYER_PASSWORD`

The workflow at `.github/workflows/ci.yml`:
- Installs dependencies and Playwright browsers
- Runs unit tests (Vitest)
- Runs `npm run db:push` and `npm run db:seed` if `NEON_DATABASE_URL` is set
- Executes E2E on Chromium and iPhone-12 projects
- Uploads the Playwright HTML report as an artifact (`playwright-report`)

Trigger CI by pushing to `main` or opening a pull request targeting `main`.

## Troubleshooting

- PayPal sign-in doesn’t appear or fails:
  - Ensure `PAYPAL_ENV=sandbox` and buyer credentials are valid.
  - Verify redirects to `http://localhost:3050` are allowed (Playwright config handles this).
- Backend errors (4xx/5xx):
  - Confirm `NEON_DATABASE_URL` is reachable; re-run `npm run db:push` and `npm run db:seed`.
- Event not found:
  - The test auto-discovers from `/events` using the seeded "React Conference 2025" card. If you prefer a specific event, set `E2E_EVENT_ID`.
- Debugging the run:
  - Inspect the Playwright report locally via `npx playwright show-report`.
  - In CI, download the `playwright-report` artifact from the workflow run.
