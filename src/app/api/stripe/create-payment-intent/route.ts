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

  // Pin Stripe API version for stability
  const stripe = new Stripe(stripeSecretKey, { apiVersion: "2025-07-30.basil" });

  try {
    const result = await db.transaction(async (tx) => {
      const ids = items.map((i) => i.ticketTypeId);
      // Lock rows
      const lockedRows = await tx
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
        .where(
          and(inArray(ticketTypes.id, ids), eq(ticketTypes.eventId, eventId))
        )
        .for("update");

      if (!lockedRows || lockedRows.length !== ids.length) {
        return NextResponse.json(
          { error: "One or more ticket types are invalid for this event" },
          { status: 400 }
        );
      }

      const currency = lockedRows[0].currency;
      let amountTotalCents = 0;
      for (const item of items) {
        const tt = lockedRows.find((r) => r.id === item.ticketTypeId);
        if (!tt) {
          return NextResponse.json(
            { error: `Invalid ticket type in request: ${item.ticketTypeId}` },
            { status: 400 }
          );
        }
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
            { error: `Not enough availability for ${tt.name}`, available },
            { status: 400 }
          );
        }
        amountTotalCents += tt.priceCents * item.quantity;
      }

      // Reserve inventory by incrementing quantitySold
      for (const item of items) {
        await tx
          .update(ticketTypes)
          .set({
            quantitySold: sql`${ticketTypes.quantitySold} + ${item.quantity}`,
          })
          .where(
            and(
              eq(ticketTypes.id, item.ticketTypeId),
              eq(ticketTypes.eventId, eventId)
            )
          );
      }

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

      // Create order items with guarded price lookup
      const values = items.map((i) => {
        const found = lockedRows.find((r) => r.id === i.ticketTypeId);
        if (!found)
          throw new Error(
            `Price lookup failed for ticketTypeId=${i.ticketTypeId}`
          );
        return {
          orderId,
          ticketTypeId: i.ticketTypeId,
          quantity: i.quantity,
          unitPriceCents: found.priceCents,
        };
      });

      await tx.insert(orderItems).values(values);

      // Create payment intent with cleanup on failure paths
      let pi: Stripe.PaymentIntent;
      try {
        pi = await stripe.paymentIntents.create({
          amount: amountTotalCents,
          currency,
          automatic_payment_methods: { enabled: true },
          metadata: {
            order_id: orderId,
            event_id: eventId,
          },
        });
      } catch (stripeError) {
        // Transaction will rollback automatically
        throw stripeError;
      }

      try {
        // Store payment intent id
        await tx
          .update(orders)
          .set({ paymentIntentId: pi.id, updatedAt: sql`now()` })
          .where(eq(orders.id, orderId));
      } catch (dbError) {
        // Cancel the payment intent to avoid orphaned intents
        await stripe.paymentIntents.cancel(pi.id).catch(console.error);
        throw dbError;
      }

      return { orderId, clientSecret: pi.client_secret };
    });

    if (result instanceof Response) {
      return result;
    }
    return NextResponse.json(result);
  } catch (error) {
    console.error("create-payment-intent error", error);
    return NextResponse.json(
      { error: "Failed to create payment intent" },
      { status: 500 }
    );
  }
}
