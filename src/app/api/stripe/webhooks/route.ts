import { NextResponse } from "next/server";
import Stripe from "stripe";
import QRCode from "qrcode";
import { db } from "@/lib/db";
import { orders, orderItems, tickets, ticketTypes, events } from "@/db/schema";
import { eq, sql, count } from "drizzle-orm";
import { sendEmail } from "@/lib/email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripeSecretKey || !stripeWebhookSecret) {
    return NextResponse.json(
      { error: "Stripe env vars not set" },
      { status: 500 }
    );
  }
  const stripe = new Stripe(stripeSecretKey, { apiVersion: "2025-07-30.basil" });

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
              .select({ id: orders.id, status: orders.status, eventId: orders.eventId, email: orders.email })
              .from(orders)
              .where(eq(orders.id, metaOrderId))
              .limit(1)
          : await db
              .select({ id: orders.id, status: orders.status, eventId: orders.eventId, email: orders.email })
              .from(orders)
              .where(eq(orders.paymentIntentId, paymentIntent.id))
              .limit(1);

        console.log("stripe:webhook:resolved order", { hasOrder: !!orderRow });
        if (!orderRow) break; // Not our order; ignore

        const txResult = await db.transaction(async (tx) => {
          // Idempotency: if already paid or tickets exist, do nothing
          const [current] = await tx
            .select({ status: orders.status })
            .from(orders)
            .where(eq(orders.id, orderRow.id))
            .limit(1);

          if (current?.status === "paid") {
            return { createdCount: 0, tokens: [] as string[] };
          }

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
            return { createdCount: 0, tokens: [] as string[] };
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
          let tokens: string[] = [];
          if (values.length > 0) {
            const inserted = await tx
              .insert(tickets)
              .values(values)
              .returning({ token: tickets.qrCodeToken });
            tokens = inserted.map((r) => r.token);
          }

          // Increment quantity_sold per ticket type
          for (const it of items) {
            await tx
              .update(ticketTypes)
              .set({ quantitySold: sql`${ticketTypes.quantitySold} + ${it.quantity}` })
              .where(eq(ticketTypes.id, it.ticketTypeId));
          }
          return { createdCount: tokens.length, tokens };
        });

        console.log("stripe:webhook:tx result", txResult);
        // Send confirmation email with QR codes only when tickets were created now
        if (txResult?.createdCount && txResult.createdCount > 0) {
          try {
            const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
            const [evt] = await db
              .select({ name: events.name, date: events.date, location: events.location })
              .from(events)
              .where(eq(events.id, orderRow.eventId))
              .limit(1);

            const qrBlocks: { img: string; url: string }[] = [];
            for (const token of txResult.tokens) {
              const url = new URL(`/api/tickets/check-in`, baseUrl);
              url.searchParams.set("token", token);
              const dataUrl = await QRCode.toDataURL(url.toString(), { width: 256, margin: 1 });
              qrBlocks.push({ img: dataUrl, url: url.toString() });
            }

            const dateStr = evt?.date ? new Date(evt.date).toLocaleString() : "";
            const subject = `${evt?.name ?? "Your Event"} — Your tickets and QR codes`;
            const qrHtml = qrBlocks
              .map(
                (b, i) => `
                  <div style="margin:16px 0;padding:12px;border:1px solid #eee;border-radius:8px;text-align:center;">
                    <div style="font-size:14px;color:#555;margin-bottom:8px;">Ticket ${i + 1}</div>
                    <img src="${b.img}" alt="Ticket QR Code" style="display:block;margin:0 auto;background:#fff;border-radius:4px;" width="192" height="192" />
                    <div style="font-size:12px;color:#777;margin-top:8px;">If scanning fails, use this link: <a href="${b.url}">${b.url}</a></div>
                  </div>
                `
              )
              .join("");

            const html = `
              <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; color: #111;">
                <h2 style="margin-bottom: 4px;">Your tickets are ready 🎟️</h2>
                <p style="margin: 0 0 16px;">Thank you for your purchase. Please find your QR codes below.</p>
                ${evt ? `<div style="font-size:14px;color:#444;margin-bottom:16px;"><strong>${evt.name}</strong>${dateStr ? ` • ${dateStr}` : ""}${evt.location ? ` • ${evt.location}` : ""}</div>` : ""}
                ${qrHtml}
                <p style="font-size:12px;color:#666;margin-top:16px;">Show these QR codes at the entrance for check‑in. Keep this email handy.</p>
              </div>
            `;

            console.log("stripe:webhook:attempting to send email", { to: orderRow.email, count: txResult.createdCount });
            if (orderRow.email) {
              await sendEmail({ to: orderRow.email, subject, html });
              console.log("✅ Sent ticket confirmation email with", txResult.createdCount, "QR(s) to", orderRow.email);
            }
          } catch (mailErr) {
            console.error("❌ Failed to send confirmation email:", mailErr);
            // Do not throw to avoid Stripe retries causing duplicate emails
          }
        }
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
    console.error("stripe:webhook handler error:", err);
    return new NextResponse(`Webhook Handler Error: ${message}`, {
      status: 500,
    });
  }

  return NextResponse.json({ received: true });
}

export function GET() {
  return NextResponse.json({ ok: true });
}
