import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { attendees } from "@/db/schema";
import { eq } from "drizzle-orm";
import { stackServerApp } from "@/stack";

export async function POST(request: Request) {
  await stackServerApp.getUser({ or: "redirect" });
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ ok: false }, { status: 400 });

  const now = new Date();
  // toggle check-in: if already set, clear it; else set to now
  const existing = await db
    .select({ checkedIn: attendees.checkedIn })
    .from(attendees)
    .where(eq(attendees.id, id))
    .limit(1);

  if (existing.length === 0)
    return NextResponse.json({ ok: false }, { status: 404 });

  await db
    .update(attendees)
    .set({ checkedIn: existing[0].checkedIn ? null : now })
    .where(eq(attendees.id, id));

  return NextResponse.json({ ok: true });
}
