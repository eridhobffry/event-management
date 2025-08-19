import { NextResponse } from "next/server";
import Stripe from "stripe";
import { db } from "@/lib/db";
import { orders, orderItems, tickets, ticketTypes } from "@/db/schema";
import { eq, sql, count } from "drizzle-orm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

const stripe = new Stripe(stripeSecretKey ?? "", {});

export async function POST(req: Request) {
  if (!stripeSecretKey || !stripeWebhookSecret) {
    return NextResponse.json(
      { error: "Stripe env vars not set" },
      { status: 500 }
    );
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json(
      { error: "Missing Stripe signature" },
      { status: 400 }
    );
  }

  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      stripeWebhookSecret
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new NextResponse(`Webhook Error: ${message}`, { status: 400 });
  }

  // Minimal handlers — log non-PII metadata only
  try {
    switch (event.type) {
      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log("stripe:webhook:payment_intent.succeeded", {
          eventId: event.id,
          amount: paymentIntent.amount,
          currency: paymentIntent.currency,
          status: paymentIntent.status,
        });

        // Resolve order by metadata or payment_intent_id
        const metaOrderId = (paymentIntent.metadata?.order_id as string) || null;
        const [orderRow] = metaOrderId
          ? await db
              .select({ id: orders.id, status: orders.status, eventId: orders.eventId })
              .from(orders)
              .where(eq(orders.id, metaOrderId))
              .limit(1)
          : await db
              .select({ id: orders.id, status: orders.status, eventId: orders.eventId })
              .from(orders)
              .where(eq(orders.paymentIntentId, paymentIntent.id))
              .limit(1);

        if (!orderRow) break; // Not our order; ignore

        await db.transaction(async (tx) => {
          // Idempotency: if already paid or tickets exist, do nothing
          const [current] = await tx
            .select({ status: orders.status })
            .from(orders)
            .where(eq(orders.id, orderRow.id))
            .limit(1);

          if (current?.status === "paid") return;

          const [{ value: existingTickets }] = await tx
            .select({ value: count() })
            .from(tickets)
            .where(eq(tickets.orderId, orderRow.id));
          if (Number(existingTickets) > 0) {
            // Ensure status reflects paid
            await tx
              .update(orders)
              .set({ status: "paid", updatedAt: sql`now()` })
              .where(eq(orders.id, orderRow.id));
            return;
          }

          // Update order status to paid
          await tx
            .update(orders)
            .set({ status: "paid", updatedAt: sql`now()` })
            .where(eq(orders.id, orderRow.id));

          // Load order items
          const items = await tx
            .select({ ticketTypeId: orderItems.ticketTypeId, quantity: orderItems.quantity })
            .from(orderItems)
            .where(eq(orderItems.orderId, orderRow.id));

          // Create tickets
          const values: { eventId: string; orderId: string; ticketTypeId: string | null; attendeeName: string | null; attendeeEmail: string | null }[] = [];
          for (const it of items) {
            for (let i = 0; i < it.quantity; i++) {
              values.push({
                eventId: orderRow.eventId,
                orderId: orderRow.id,
                ticketTypeId: it.ticketTypeId,
                attendeeName: null,
                attendeeEmail: null,
              });
            }
          }
          if (values.length > 0) {
            await tx.insert(tickets).values(values);
          }

          // Increment quantity_sold per ticket type
          for (const it of items) {
            await tx
              .update(ticketTypes)
              .set({ quantitySold: sql`${ticketTypes.quantitySold} + ${it.quantity}` })
              .where(eq(ticketTypes.id, it.ticketTypeId));
          }
        });
        break;
      }
      case "payment_intent.payment_failed": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log("stripe:webhook:payment_intent.payment_failed", {
          eventId: event.id,
          amount: paymentIntent.amount,
          currency: paymentIntent.currency,
          status: paymentIntent.status,
        });

        const metaOrderId = (paymentIntent.metadata?.order_id as string) || null;
        if (metaOrderId) {
          await db
            .update(orders)
            .set({ status: "failed", updatedAt: sql`now()` })
            .where(eq(orders.id, metaOrderId));
        } else {
          await db
            .update(orders)
            .set({ status: "failed", updatedAt: sql`now()` })
            .where(eq(orders.paymentIntentId, paymentIntent.id));
        }
        break;
      }
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        console.log("stripe:webhook:checkout.session.completed", {
          eventId: event.id,
          amountTotal: session.amount_total,
          currency: session.currency,
          mode: session.mode,
        });
        // Optional: You can also resolve by session.payment_intent and fall back to the same logic as above
        break;
      }
      default: {
        console.log("stripe:webhook:unhandled", {
          type: event.type,
          eventId: event.id,
        });
        break;
      }
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new NextResponse(`Webhook Handler Error: ${message}`, {
      status: 500,
    });
  }

  return NextResponse.json({ received: true });
}

export function GET() {
  return NextResponse.json({ ok: true });
}
