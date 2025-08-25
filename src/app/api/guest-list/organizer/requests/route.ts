import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { guestListRequests, events } from "@/db/schema";
import { eq } from "drizzle-orm";
import { stackServerApp } from "@/stack";

export async function GET() {
  try {
    // Get current user (organizer)
    const user = await stackServerApp.getUser();
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Get all guest list requests for events created by this user
    const requests = await db
      .select({
        id: guestListRequests.id,
        eventId: guestListRequests.eventId,
        eventName: events.name,
        eventDate: events.date,
        requesterName: guestListRequests.requesterName,
        requesterEmail: guestListRequests.requesterEmail,
        reason: guestListRequests.reason,
        status: guestListRequests.status,
        requestedAt: guestListRequests.requestedAt,
        reviewedAt: guestListRequests.reviewedAt,
        reviewNotes: guestListRequests.reviewNotes,
      })
      .from(guestListRequests)
      .innerJoin(events, eq(guestListRequests.eventId, events.id))
      .where(eq(events.createdBy, user.id))
      .orderBy(guestListRequests.requestedAt);

    return NextResponse.json({
      requests: requests.map((req) => ({
        ...req,
        eventDate: req.eventDate?.toISOString() || null,
        requestedAt: req.requestedAt?.toISOString() || null,
        reviewedAt: req.reviewedAt?.toISOString() || null,
      })),
    });
  } catch (error) {
    console.error("Failed to fetch guest list requests:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
