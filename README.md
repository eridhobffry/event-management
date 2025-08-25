This is an Event Management dashboard built with Next.js (App Router), Drizzle ORM, Neon, and Stack Auth. See `docs/` for product docs. The canonical sprint plan is at `docs/CURRENT_SPRINT.md` (older plans are archived in `docs/archive/`).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Stripe Test Setup (scaffold)

1. Install SDK

```bash
npm install stripe
```

2. Add envs (see `.env.local.example`)

```bash
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

3. Start dev server, then in another terminal:

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhooks
stripe trigger payment_intent.succeeded
```

4. Webhook route

The scaffold lives at `src/app/api/stripe/webhooks/route.ts` and validates signature; no business logic yet.

See `CORE_CHALLENGE_PAYMENT.md` for payment design notes.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## CI Environment (GitHub Actions)

Our CI runs unit tests (Vitest) and E2E tests (Playwright). The workflow will:

- **Start a local Postgres service**. If `NEON_DATABASE_URL` is not set as a repository secret, CI falls back to `postgresql://postgres:postgres@localhost:5432/postgres`.
- **Always run migrations and seed** before E2E:
  - `npm run db:push`
  - `npm run db:seed`
- **Start the app** for Playwright on `http://localhost:3050` via Playwright `webServer`.
- **Retry E2E on CI**: Playwright `retries` is `2` when `CI` is true.

### Required CI secrets (recommended)

- `NEON_DATABASE_URL` (optional if you prefer the local Postgres service)
- `PAYPAL_CLIENT_ID`
- `PAYPAL_SECRET`
- `PAYPAL_ENV` (e.g. `sandbox`)
- `PAYPAL_SANDBOX_BUYER_EMAIL` (Personal Sandbox account email for E2E)
- `PAYPAL_SANDBOX_BUYER_PASSWORD` (password for the buyer account)

See `docs/CI_SETUP.md` for a step‑by‑step guide to configure these and PayPal Sandbox accounts.

## Inventory Reservations

Learn how reservations are created, released, and how to run the cleanup task:

- `docs/INVENTORY_RESERVATIONS.md`

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
