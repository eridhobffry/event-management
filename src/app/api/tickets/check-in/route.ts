import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { tickets } from "@/db/schema";
import { eq } from "drizzle-orm";
import { stackServerApp } from "@/stack";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function toggleCheckIn(token: string) {
  const [row] = await db
    .select({ id: tickets.id, checkedInAt: tickets.checkedInAt, status: tickets.status })
    .from(tickets)
    .where(eq(tickets.qrCodeToken, token))
    .limit(1);

  if (!row) return { status: 404 as const };

  const now = new Date();
  const checkedIn = !!row.checkedInAt;

  await db
    .update(tickets)
    .set({
      checkedInAt: checkedIn ? null : now,
      status: checkedIn ? "issued" : "checked_in",
    })
    .where(eq(tickets.id, row.id));

  return {
    status: 200 as const,
    body: {
      ok: true,
      ticketId: row.id,
      checkedIn: !checkedIn,
      checkedInAt: checkedIn ? null : now.toISOString(),
    },
  };
}

export async function GET(req: Request) {
  // Require an authenticated organizer/staff
  await stackServerApp.getUser({ or: "redirect" });

  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");
  if (!token) return NextResponse.json({ ok: false, error: "Missing token" }, { status: 400 });

  const result = await toggleCheckIn(token);
  if (result.status === 404) return NextResponse.json({ ok: false }, { status: 404 });
  return NextResponse.json(result.body);
}

export async function POST(req: Request) {
  // Require an authenticated organizer/staff
  await stackServerApp.getUser({ or: "redirect" });

  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");
  if (!token) return NextResponse.json({ ok: false, error: "Missing token" }, { status: 400 });

  const result = await toggleCheckIn(token);
  if (result.status === 404) return NextResponse.json({ ok: false }, { status: 404 });
  return NextResponse.json(result.body);
}
