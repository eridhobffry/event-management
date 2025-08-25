import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { orders, orderItems, tickets, ticketTypes } from "@/db/schema";
import { and, count, eq, lt, sql } from "drizzle-orm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function minutesAgo(minutes: number): Date {
  const d = new Date();
  d.setMinutes(d.getMinutes() - minutes);
  return d;
}

export async function GET(req: Request) {
  try {
    // Check authentication first
    const secret = req.headers.get("x-cron-secret");
    if (!secret || secret !== process.env.ADMIN_CLEANUP_SECRET) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const ttl = Number(searchParams.get("ttlMinutes") ?? 30);
    if (!Number.isFinite(ttl) || ttl <= 0) {
      return NextResponse.json(
        { ok: false, error: "Invalid ttlMinutes" },
        { status: 400 }
      );
    }
    const ttlMinutes = ttl;

    const cutoff = minutesAgo(ttlMinutes);

    const candidates = await db
      .select({ id: orders.id })
      .from(orders)
      .where(and(eq(orders.status, "pending"), lt(orders.createdAt, cutoff)));

    let released = 0;
    let skipped = 0;

    for (const c of candidates) {
      await db.transaction(async (tx) => {
        const [{ value: ticketCount }] = await tx
          .select({ value: count() })
          .from(tickets)
          .where(eq(tickets.orderId, c.id));

        if (Number(ticketCount) > 0) {
          skipped += 1;
          await tx
            .update(orders)
            .set({ status: "failed", updatedAt: sql`now()` })
            .where(eq(orders.id, c.id));
          return;
        }

        const items = await tx
          .select({
            ticketTypeId: orderItems.ticketTypeId,
            quantity: orderItems.quantity,
          })
          .from(orderItems)
          .where(eq(orderItems.orderId, c.id));

        for (const it of items) {
          await tx
            .update(ticketTypes)
            .set({
              quantitySold: sql`${ticketTypes.quantitySold} - ${it.quantity}`,
            })
            .where(eq(ticketTypes.id, it.ticketTypeId));
        }

        await tx
          .update(orders)
          .set({ status: "failed", updatedAt: sql`now()` })
          .where(eq(orders.id, c.id));

        released += 1;
      });
    }

    return NextResponse.json(
      {
        ok: true,
        ttlMinutes,
        scanned: candidates.length,
        released,
        skipped,
      },
      { status: 200 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
