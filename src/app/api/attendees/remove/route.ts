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

  await db.delete(attendees).where(eq(attendees.id, id));
  return NextResponse.json({ ok: true });
}
