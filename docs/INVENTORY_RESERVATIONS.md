# Inventory Reservations and Releases

This document explains how ticket inventory is reserved, when it is released, and how to operate the cleanup task to avoid stale reservations and overselling.

## Overview

- Reservations happen at payment initialization time (before the payment is confirmed):
  - Stripe: `POST /api/stripe/create-payment-intent`
  - PayPal: `POST /api/paypal/create-order`
- On reservation, we increment `ticket_types.quantity_sold` for each item in the order. This temporarily holds inventory for the buyer while they complete payment.
- When payment succeeds, we issue tickets and mark the order as `paid`. We do NOT increment inventory again on success (it was already reserved at creation time).
- If payment fails, is canceled, or the order goes stale, we release the reservation by decrementing `quantity_sold` and marking the order as `failed`.

## Data model

- `orders.status` transitions:
  - `pending` → `paid` (on successful capture/webhook)
  - `pending` → `failed` (on cancel/failure/cleanup)
  - Terminal statuses are not overridden (paid/failed/canceled stay as-is).
- `orders.paymentIntentId` stores processor intent/order IDs (Stripe PI or PayPal Order ID). For PayPal, this is the PayPal Order ID.
- `order_items` define which ticket types and quantities were reserved.
- `tickets` are created only after a successful payment and are idempotent (won’t be duplicated).
- `ticket_types.quantitySold` reflects reservations (pre‑payment) and is decremented on release.

## Reservation flows

- Stripe
  - Reserve in `POST /api/stripe/create-payment-intent` (increment `quantitySold`).
  - On success (`payment_intent.succeeded` webhook): mark order `paid`, create tickets, send email.
  - On failure or cancel (`payment_intent.payment_failed`, `payment_intent.canceled`): release reservation (decrement `quantitySold`) and mark `failed` if still `pending`.

- PayPal
  - Reserve in `POST /api/paypal/create-order` (increment `quantitySold`).
  - On capture (`POST /api/paypal/capture`): set `paid` and create tickets only if order is still `pending`. Will not override `failed`/`canceled`.
  - On cancel: call the cancel API (below) to release if still `pending`.

## APIs

- PayPal cancel (idempotent release)
  - `POST /api/paypal/cancel` with JSON `{ paypalOrderId: string }`
  - Or `GET /api/paypal/cancel?token=<PayPalOrderId>` (also accepts `paypalOrderId`)
  - Response on success: `{ ok: true, released: boolean, orderId?: string }`
  - If no matching order: `{ ok: true, released: false, reason: "order_not_found" }`

- Admin cleanup (release stale pending orders)
  - `GET /api/admin/release-stale-reservations?ttlMinutes=30&secret=...`
  - Auth: provide `secret` query param or `x-cron-secret` header.
    - Server-side checks `ADMIN_CLEANUP_SECRET` or `CRON_SECRET`.
  - Response: `{ ok: true, ttlMinutes, scanned, released, skipped }`
    - `released`: reservations released (no tickets existed)
    - `skipped`: orders with tickets found; marked `failed` but no inventory change

## Configuration

- `ADMIN_CLEANUP_SECRET` or `CRON_SECRET`: token to authenticate cleanup route
- `RESERVATION_TTL_MINUTES` (default 30): used if `ttlMinutes` is not provided in query
- `NEXT_PUBLIC_APP_URL`: required in production to generate absolute links in emails and payment redirects
- `PAYPAL_E2E_MODE` / `NEXT_PUBLIC_PAYPAL_E2E_MODE`: when set to `mock`, PayPal routes short‑circuit for tests

## Operating the cleanup task

You can trigger cleanup manually or via a scheduler (e.g., cron, GitHub Actions, or a hosted scheduler):

```bash
# Example manual run (30-minute TTL)
curl -sS "https://your-app.example.com/api/admin/release-stale-reservations?ttlMinutes=30&secret=$ADMIN_CLEANUP_SECRET"
```

Scheduler tips:
- Run every 10–30 minutes based on your payment timeout policy.
- Use a short TTL (e.g., 20–30 minutes) to balance user completion time with inventory freshness.

## Idempotency and safety

- Capture and webhook handlers are idempotent: they only mark `paid` and create tickets once.
- Cancel and cleanup routes only transition `pending` orders to `failed` and will not alter terminal states.
- Inventory release only occurs if no tickets exist for the order.

## Troubleshooting

- Overselling suspicion:
  - Verify reservation increments occur only at payment-intent/order creation.
  - Confirm success handlers do not increment again.
- Stuck reservations:
  - Ensure cleanup route is scheduled and the secret is set correctly.
  - Manually trigger the cleanup route with a small TTL and verify `released` increases.
