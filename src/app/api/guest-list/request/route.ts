import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { guestListRequests, attendees, users } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { sendGuestListRequestNotification } from "@/lib/guest-list-notifications";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { attendeeId, reason } = body;

    if (!attendeeId || typeof attendeeId !== "string") {
      return NextResponse.json(
        { error: "Attendee ID is required" },
        { status: 400 }
      );
    }

    // Get attendee details
    const attendee = await db.query.attendees.findFirst({
      where: eq(attendees.id, attendeeId),
      with: {
        event: true,
      },
    });

    if (!attendee) {
      return NextResponse.json(
        { error: "Attendee not found" },
        { status: 404 }
      );
    }

    // Get event details
    const event = attendee.event;

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // Check if request already exists
    const existingRequest = await db.query.guestListRequests.findFirst({
      where: and(
        eq(guestListRequests.attendeeId, attendeeId),
        eq(guestListRequests.eventId, attendee.event.id)
      ),
    });

    if (existingRequest) {
      return NextResponse.json(
        {
          error: "Guest list request already exists",
          status: existingRequest.status,
        },
        { status: 409 }
      );
    }

    // Create guest list request
    const [newRequest] = await db
      .insert(guestListRequests)
      .values({
        eventId: attendee.event.id,
        attendeeId: attendeeId,
        requesterEmail: attendee.email,
        requesterName: attendee.name,
        reason: reason || null,
      })
      .returning();

    // Send notification to event organizer
    if (event.createdBy) {
      try {
        // Get organizer email
        const organizer = await db.query.users.findFirst({
          where: eq(users.id, event.createdBy),
        });

        if (organizer?.email) {
          await sendGuestListRequestNotification({
            organizerEmail: organizer.email,
            eventName: event.name,
            eventId: event.id,
            requesterName: attendee.name,
            requesterEmail: attendee.email,
            reason: reason || "No reason provided",
            requestId: newRequest.id,
          });
        }
      } catch (emailError) {
        console.error("Failed to send organizer notification:", emailError);
        // Don't fail the request if email fails
      }
    }

    return NextResponse.json({
      success: true,
      requestId: newRequest.id,
      status: newRequest.status,
    });
  } catch (error) {
    console.error("Guest list request error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
