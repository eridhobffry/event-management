import { NextResponse } from "next/server";
import { z } from "zod";
import QRCode from "qrcode";
import { db } from "@/lib/db";
import { orders, orderItems, tickets, events } from "@/db/schema";
import { and, eq, sql, count } from "drizzle-orm";
import { sendEmail } from "@/lib/email";
import { getPayPalAccessToken, getPayPalApiBase } from "@/lib/paypal";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BodySchema = z.object({
  paypalOrderId: z.string(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const parsed = BodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }
    const { paypalOrderId } = parsed.data;

    // In mocked E2E runs, do not contact PayPal. Let the test harness handle
    // full success semantics via its own mocked responses on the client path.
    const isMock =
      process.env.PAYPAL_E2E_MODE === "mock" ||
      process.env.NEXT_PUBLIC_PAYPAL_E2E_MODE === "mock";
    if (isMock) {
      return NextResponse.json({ ok: true, received: true });
    }

    const accessToken = await getPayPalAccessToken();
    const base = getPayPalApiBase();

    // Get order details to validate state and reference_id (our orderId)
    const detailsRes = await fetch(`${base}/v2/checkout/orders/${paypalOrderId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });

    if (!detailsRes.ok) {
      const text = await detailsRes.text().catch(() => "");
      return NextResponse.json({ error: `PayPal get order error: ${detailsRes.status} ${text}` }, { status: 502 });
    }
    type PayPalOrderDetails = {
      status?: string;
      purchase_units?: Array<{ reference_id?: string }>;
    };
    const details: PayPalOrderDetails = await detailsRes.json();

    const referenceId: string | undefined = details?.purchase_units?.[0]?.reference_id;
    const status: string | undefined = details?.status;
    console.log("paypal:capture:details", {
      paypalOrderId,
      status,
      referenceId,
    });

    if (!referenceId) {
      return NextResponse.json({ error: "Missing reference_id in PayPal order" }, { status: 400 });
    }

    // If not captured yet, capture now
    if (status !== "COMPLETED") {
      const capRes = await fetch(`${base}/v2/checkout/orders/${paypalOrderId}/capture`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      });
      if (!capRes.ok) {
        const text = await capRes.text().catch(() => "");
        return NextResponse.json({ error: `PayPal capture error: ${capRes.status} ${text}` }, { status: 502 });
      }
    }

    // Idempotent ticket issuance and email (parity with Stripe webhook)
    const [orderRow] = await db
      .select({ id: orders.id, status: orders.status, eventId: orders.eventId, email: orders.email })
      .from(orders)
      .where(eq(orders.id, referenceId))
      .limit(1);

    if (!orderRow) {
      // Align: if the order isn't ours, return 200 to avoid client retries
      return NextResponse.json({ received: true });
    }

    const txResult = await db.transaction(async (tx) => {
      // Respect terminal states and only process pending orders
      const [current] = await tx
        .select({ status: orders.status })
        .from(orders)
        .where(eq(orders.id, orderRow.id))
        .limit(1);

      if (current?.status === "paid") return { createdCount: 0, tokens: [] as string[] };
      if (current?.status && current.status !== "pending") {
        // Do not override failed/canceled or other states
        return { createdCount: 0, tokens: [] as string[] };
      }

      const [{ value: existingTickets }] = await tx
        .select({ value: count() })
        .from(tickets)
        .where(eq(tickets.orderId, orderRow.id));
      if (Number(existingTickets) > 0) {
        // Ensure status reflects payment only if still pending
        await tx
          .update(orders)
          .set({ status: "paid", updatedAt: sql`now()` })
          .where(and(eq(orders.id, orderRow.id), eq(orders.status, "pending")));
        return { createdCount: 0, tokens: [] as string[] };
      }

      // Atomically transition to paid only if still pending
      const updated = await tx
        .update(orders)
        .set({ status: "paid", updatedAt: sql`now()` })
        .where(and(eq(orders.id, orderRow.id), eq(orders.status, "pending")))
        .returning({ id: orders.id });
      if (updated.length === 0) {
        return { createdCount: 0, tokens: [] as string[] };
      }

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
            attendeeEmail: orderRow.email ?? null,
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

      // Note: inventory was already reserved by incrementing quantitySold
      // in /api/paypal/create-order. Do NOT increment again here.
      return { createdCount: tokens.length, tokens };
    });

    console.log("paypal:capture:tx_result", {
      orderId: orderRow.id,
      eventId: orderRow.eventId,
      createdCount: txResult.createdCount,
      tokensCount: txResult.tokens.length,
    });

    if (txResult?.createdCount && txResult.createdCount > 0) {
      try {
        const requestOrigin = new URL(req.url).origin;
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || requestOrigin;
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

        if (orderRow.email) {
          console.log("paypal:capture:email:attempt", {
            to: orderRow.email,
            tokenCount: txResult.tokens.length,
            orderId: orderRow.id,
          });
          await sendEmail({ to: orderRow.email, subject, html });
          console.log("paypal:capture:email:sent", {
            to: orderRow.email,
            tokenCount: txResult.tokens.length,
            orderId: orderRow.id,
          });
        }
      } catch (mailErr) {
        console.error("❌ Failed to send confirmation email:", mailErr);
      }
    } else {
      console.log("paypal:capture:email:skipped", {
        reason: "no_new_tickets",
        orderId: orderRow?.id,
        eventId: orderRow?.eventId,
      });
    }

    return NextResponse.json({ ok: true, orderId: orderRow?.id, eventId: orderRow?.eventId });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
