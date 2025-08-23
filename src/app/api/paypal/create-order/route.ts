import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { orders, orderItems, ticketTypes } from "@/db/schema";
import { and, eq, inArray, sql } from "drizzle-orm";
import { getPayPalAccessToken, getPayPalApiBase } from "@/lib/paypal";

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
  try {
    const body = await req.json().catch(() => null);
    const parsed = RequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { eventId, email, items } = parsed.data;
    const ids = items.map((i) => i.ticketTypeId);

    // Validate base URL in production to avoid broken redirects
    if (process.env.NODE_ENV === "production" && !process.env.NEXT_PUBLIC_APP_URL) {
      return NextResponse.json(
        { error: "Server misconfigured: NEXT_PUBLIC_APP_URL is required in production." },
        { status: 500 }
      );
    }

    const result = await db.transaction(async (tx) => {
      // Lock ticket types and validate within the transaction
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
        .where(and(inArray(ticketTypes.id, ids), eq(ticketTypes.eventId, eventId)))
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

      // Reserve by incrementing quantitySold while rows are locked
      for (const item of items) {
        await tx
          .update(ticketTypes)
          .set({ quantitySold: sql`${ticketTypes.quantitySold} + ${item.quantity}` })
          .where(and(eq(ticketTypes.id, item.ticketTypeId), eq(ticketTypes.eventId, eventId)));
      }

      const totalDecimal = (amountTotalCents / 100).toFixed(2);
      const paypalCurrency = currency.toUpperCase();

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
      const values = items.map((i) => {
        const found = lockedRows.find((r) => r.id === i.ticketTypeId);
        if (!found) throw new Error(`Price lookup failed for ticketTypeId=${i.ticketTypeId}`);
        return {
          orderId,
          ticketTypeId: i.ticketTypeId,
          quantity: i.quantity,
          unitPriceCents: found.priceCents,
        };
      });
      await tx.insert(orderItems).values(values);

      // Create PayPal order
      const accessToken = await getPayPalAccessToken();
      const apiBase = getPayPalApiBase();
      const requestOrigin = new URL(req.url).origin;
      const isProd = process.env.NODE_ENV === "production";
      const baseUrl = isProd
        ? process.env.NEXT_PUBLIC_APP_URL || requestOrigin
        : requestOrigin;
      const returnUrl = new URL("/paypal/return", baseUrl).toString();
      const cancelUrl = new URL("/paypal/cancel", baseUrl).toString();
      const res = await fetch(`${apiBase}/v2/checkout/orders`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          intent: "CAPTURE",
          purchase_units: [
            {
              amount: {
                currency_code: paypalCurrency,
                value: totalDecimal,
              },
              reference_id: orderId,
            },
          ],
          application_context: {
            brand_name: "Event Management",
            shipping_preference: "NO_SHIPPING",
            user_action: "PAY_NOW",
            return_url: returnUrl,
            cancel_url: cancelUrl,
          },
        }),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`PayPal create order error: ${res.status} ${text}`);
      }
      type PayPalCreateOrderResponse = {
        id: string;
        links?: Array<{ rel?: string; href?: string }>;
      };
      const data: PayPalCreateOrderResponse = await res.json();
      const approvalUrl = data.links?.find((l) => l.rel === "approve")?.href;

      // Store PayPal order id in paymentIntentId field
      await tx
        .update(orders)
        .set({ paymentIntentId: data.id, updatedAt: sql`now()` })
        .where(eq(orders.id, orderId));

      return { orderId, paypalOrderId: data.id, approvalUrl };
    });

    if (result instanceof Response) {
      return result;
    }
    return NextResponse.json(result);
  } catch (err) {
    // Log detailed error server-side, but return a generic message to the client
    if (err instanceof Error) {
      console.error("PayPal create-order error:", err.stack || err.message);
    } else {
      console.error("PayPal create-order error (non-Error):", err);
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
