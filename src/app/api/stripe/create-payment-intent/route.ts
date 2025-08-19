import { NextResponse } from "next/server";
import Stripe from "stripe";
import { z } from "zod";

import { db } from "@/lib/db";
import { orders, orderItems, ticketTypes } from "@/db/schema";
import { and, eq, inArray, sql } from "drizzle-orm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RequestSchema = z.object({
  eventId: z.string().uuid(),
  email: z.string().email(),
  items: z
    .array(
      z.object({
        ticketTypeId: z.string().uuid(),
        quantity: z.number().int().positive(),
      })
    )
    .min(1),
});

export async function POST(req: Request) {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecretKey) {
    return NextResponse.json(
      { error: "Stripe secret not configured" },
      { status: 500 }
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { eventId, email, items } = parsed.data;

  // Fetch ticket types and validate
  const ids = items.map((i) => i.ticketTypeId);
  const rows = await db
    .select({
      id: ticketTypes.id,
      eventId: ticketTypes.eventId,
      isActive: ticketTypes.isActive,
      priceCents: ticketTypes.priceCents,
      currency: ticketTypes.currency,
      quantityTotal: ticketTypes.quantityTotal,
      quantitySold: ticketTypes.quantitySold,
      name: ticketTypes.name,
    })
    .from(ticketTypes)
    .where(and(inArray(ticketTypes.id, ids), eq(ticketTypes.eventId, eventId)));

  if (rows.length !== ids.length) {
    return NextResponse.json(
      { error: "One or more ticket types are invalid for this event" },
      { status: 400 }
    );
  }

  // Ensure active and availability; ensure single currency
  const currency = rows[0].currency;
  let amountTotalCents = 0;
  for (const item of items) {
    const tt = rows.find((r) => r.id === item.ticketTypeId)!;
    if (!tt.isActive) {
      return NextResponse.json(
        { error: `Ticket type ${tt.name} is not active` },
        { status: 400 }
      );
    }
    if (tt.currency !== currency) {
      return NextResponse.json(
        { error: "All items must share the same currency" },
        { status: 400 }
      );
    }
    const available = tt.quantityTotal - tt.quantitySold;
    if (item.quantity > available) {
      return NextResponse.json(
        {
          error: `Not enough availability for ${tt.name}`,
          available,
        },
        { status: 400 }
      );
    }
    amountTotalCents += tt.priceCents * item.quantity;
  }

  const stripe = new Stripe(stripeSecretKey, {});

  try {
    const result = await db.transaction(async (tx) => {
      // Create order (pending)
      const [order] = await tx
        .insert(orders)
        .values({
          eventId,
          email,
          amountTotalCents,
          currency,
          status: "pending",
        })
        .returning({ id: orders.id });

      const orderId = order.id;

      // Create order items
      const values = items.map((i) => ({
        orderId,
        ticketTypeId: i.ticketTypeId,
        quantity: i.quantity,
        unitPriceCents: rows.find((r) => r.id === i.ticketTypeId)!.priceCents,
      }));

      await tx.insert(orderItems).values(values);

      // Create payment intent
      const pi = await stripe.paymentIntents.create({
        amount: amountTotalCents,
        currency,
        automatic_payment_methods: { enabled: true },
        metadata: {
          order_id: orderId,
          event_id: eventId,
        },
      });

      // Store payment intent id
      await tx
        .update(orders)
        .set({ paymentIntentId: pi.id, updatedAt: sql`now()` })
        .where(eq(orders.id, orderId));

      return { orderId, clientSecret: pi.client_secret };
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("create-payment-intent error", error);
    return NextResponse.json(
      { error: "Failed to create payment intent" },
      { status: 500 }
    );
  }
}
