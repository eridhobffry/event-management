import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { proactiveGuestList } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get("eventId");
    const email = searchParams.get("email");

    if (!eventId || !email) {
      return NextResponse.json(
        { error: "Event ID and email are required" },
        { status: 400 }
      );
    }

    // Check if this email is on the proactive guest list for this event
    const guestEntry = await db.query.proactiveGuestList.findFirst({
      where: and(
        eq(proactiveGuestList.eventId, eventId),
        eq(proactiveGuestList.guestEmail, email.toLowerCase()),
        eq(proactiveGuestList.status, "active")
      ),
    });

    if (guestEntry) {
      return NextResponse.json({
        isProactiveGuest: true,
        guestTitle: guestEntry.guestTitle,
        personalMessage: guestEntry.personalMessage,
        qrCodeToken: guestEntry.qrCodeToken,
        guestName: guestEntry.guestName,
      });
    }

    return NextResponse.json({
      isProactiveGuest: false,
    });
  } catch (error) {
    console.error("Failed to check proactive guest list:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
