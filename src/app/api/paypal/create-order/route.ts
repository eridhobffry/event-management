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

    // Validate ticket types
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
          { error: `Not enough availability for ${tt.name}`, available },
          { status: 400 }
        );
      }
      amountTotalCents += tt.priceCents * item.quantity;
    }

    const totalDecimal = (amountTotalCents / 100).toFixed(2);
    const paypalCurrency = currency.toUpperCase();

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

      // Create PayPal order
      const accessToken = await getPayPalAccessToken();
      const res = await fetch(`${getPayPalApiBase()}/v2/checkout/orders`, {
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
            return_url: "http://localhost:3000/api/paypal/return", // unused with server capture
            cancel_url: "http://localhost:3000/api/paypal/cancel",
          },
        }),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`PayPal create order error: ${res.status} ${text}`);
      }
      const data = (await res.json()) as { id: string };

      // Store PayPal order id in paymentIntentId field
      await tx
        .update(orders)
        .set({ paymentIntentId: data.id, updatedAt: sql`now()` })
        .where(eq(orders.id, orderId));

      return { orderId, paypalOrderId: data.id };
    });

    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
