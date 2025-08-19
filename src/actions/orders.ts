"use server";

import { db } from "@/lib/db";
import { events, orders, orderItems, ticketTypes } from "@/db/schema";
import { and, eq } from "drizzle-orm";

export type PurchaseSuccessData = {
  event: { id: string; name: string; date: Date | null; location: string | null };
  order: { id: string; status: string; amountTotalCents: number; currency: string } | null;
  items:
    | { name: string | null; quantity: number; unitPriceCents: number; ticketTypeId: string | null }[]
    | null;
};

export async function getPurchaseSuccessData(
  eventId: string,
  orderId: string | null
): Promise<PurchaseSuccessData | null> {
  // Load event header fields
  const [event] = await db
    .select({ id: events.id, name: events.name, date: events.date, location: events.location })
    .from(events)
    .where(eq(events.id, eventId))
    .limit(1);

  if (!event) return null;

  let order: PurchaseSuccessData["order"] = null;
  let items: PurchaseSuccessData["items"] = null;

  if (orderId) {
    const [row] = await db
      .select({
        id: orders.id,
        status: orders.status,
        amountTotalCents: orders.amountTotalCents,
        currency: orders.currency,
      })
      .from(orders)
      .where(and(eq(orders.id, orderId), eq(orders.eventId, eventId)))
      .limit(1);

    order = row ?? null;

    if (order) {
      const rows = await db
        .select({
          name: ticketTypes.name,
          quantity: orderItems.quantity,
          unitPriceCents: orderItems.unitPriceCents,
          ticketTypeId: orderItems.ticketTypeId,
        })
        .from(orderItems)
        .leftJoin(ticketTypes, eq(ticketTypes.id, orderItems.ticketTypeId))
        .where(eq(orderItems.orderId, order.id));
      items = rows;
    }
  }

  return { event, order, items };
}
