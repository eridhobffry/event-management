import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { orders, orderItems, tickets, ticketTypes } from "@/db/schema";
import { and, eq, sql, count } from "drizzle-orm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BodySchema = z.object({
  paypalOrderId: z.string(),
});

async function releaseByPayPalOrderId(paypalOrderId: string) {
  const [orderRow] = await db
    .select({ id: orders.id })
    .from(orders)
    .where(eq(orders.paymentIntentId, paypalOrderId))
    .limit(1);

  if (!orderRow) {
    return { ok: true, released: false, reason: "order_not_found" as const };
  }

  let released = false;
  await db.transaction(async (tx) => {
    const [current] = await tx
      .select({ status: orders.status })
      .from(orders)
      .where(eq(orders.id, orderRow.id))
      .limit(1);

    if (!current) return;

    // If already terminal, leave as-is
    if (current.status === "paid" || current.status === "failed" || current.status === "canceled") {
      return;
    }

    // Attempt to transition to failed only if currently pending
    const updated = await tx
      .update(orders)
      .set({ status: "failed", updatedAt: sql`now()` })
      .where(and(eq(orders.id, orderRow.id), eq(orders.status, "pending")))
      .returning({ id: orders.id });

    if (updated.length === 0) {
      // Another process already changed status; do not release
      return;
    }

    // Release only if no tickets exist
    const [{ value: existingTickets }] = await tx
      .select({ value: count() })
      .from(tickets)
      .where(eq(tickets.orderId, orderRow.id));

    if (Number(existingTickets) === 0) {
      const items = await tx
        .select({ ticketTypeId: orderItems.ticketTypeId, quantity: orderItems.quantity })
        .from(orderItems)
        .where(eq(orderItems.orderId, orderRow.id));

      for (const it of items) {
        await tx
          .update(ticketTypes)
          .set({ quantitySold: sql`${ticketTypes.quantitySold} - ${it.quantity}` })
          .where(eq(ticketTypes.id, it.ticketTypeId));
      }
      released = true;
    }
  });

  return { ok: true, released, orderId: orderRow.id };
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const parsed = BodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    // In mock E2E, acknowledge without touching DB
    const isMock =
      process.env.PAYPAL_E2E_MODE === "mock" ||
      process.env.NEXT_PUBLIC_PAYPAL_E2E_MODE === "mock";
    if (isMock) {
      return NextResponse.json({ ok: true, received: true });
    }

    const result = await releaseByPayPalOrderId(parsed.data.paypalOrderId);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const paypalOrderId = url.searchParams.get("token") || url.searchParams.get("paypalOrderId");
    if (!paypalOrderId) {
      return NextResponse.json({ error: "Missing token" }, { status: 400 });
    }

    const isMock =
      process.env.PAYPAL_E2E_MODE === "mock" ||
      process.env.NEXT_PUBLIC_PAYPAL_E2E_MODE === "mock";
    if (isMock) {
      return NextResponse.json({ ok: true, received: true });
    }

    const result = await releaseByPayPalOrderId(paypalOrderId);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
