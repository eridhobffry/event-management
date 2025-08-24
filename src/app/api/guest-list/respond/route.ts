import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { guestListRequests, events } from "@/db/schema";
import { eq } from "drizzle-orm";
import { stackServerApp } from "@/stack";
import {
  sendGuestListApprovalNotification,
  sendGuestListRejectionNotification,
} from "@/lib/guest-list-notifications";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { requestId, action, reviewNotes } = body;

    if (!requestId || !action) {
      return NextResponse.json(
        { error: "Request ID and action are required" },
        { status: 400 }
      );
    }

    if (!["approve", "reject"].includes(action)) {
      return NextResponse.json(
        { error: "Action must be 'approve' or 'reject'" },
        { status: 400 }
      );
    }

    // Get current user (organizer)
    const user = await stackServerApp.getUser();
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Get the guest list request
    const guestRequest = await db.query.guestListRequests.findFirst({
      where: eq(guestListRequests.id, requestId),
    });

    if (!guestRequest) {
      return NextResponse.json(
        { error: "Guest list request not found" },
        { status: 404 }
      );
    }

    // Get event to verify organizer permissions
    const event = await db.query.events.findFirst({
      where: eq(events.id, guestRequest.eventId),
    });

    if (!event || event.createdBy !== user.id) {
      return NextResponse.json(
        { error: "Not authorized to respond to this request" },
        { status: 403 }
      );
    }

    // Update request status
    const status = action === "approve" ? "approved" : "rejected";
    const [updatedRequest] = await db
      .update(guestListRequests)
      .set({
        status,
        reviewedBy: user.id,
        reviewedAt: new Date(),
        reviewNotes: reviewNotes || null,
      })
      .where(eq(guestListRequests.id, requestId))
      .returning();

    // Send response email to requester
    try {
      if (action === "approve") {
        await sendGuestListApprovalNotification({
          requesterEmail: guestRequest.requesterEmail,
          requesterName: guestRequest.requesterName,
          eventName: event.name,
          eventId: event.id,
          eventDate: event.date || new Date(),
          qrCodeToken: updatedRequest.qrCodeToken!,
          reviewNotes,
        });
      } else {
        await sendGuestListRejectionNotification({
          requesterEmail: guestRequest.requesterEmail,
          requesterName: guestRequest.requesterName,
          eventName: event.name,
          eventId: event.id,
          reviewNotes,
        });
      }
    } catch (emailError) {
      console.error("Failed to send response email:", emailError);
      // Don't fail the request if email fails
    }

    return NextResponse.json({
      success: true,
      status: updatedRequest.status,
      reviewedAt: updatedRequest.reviewedAt,
    });
  } catch (error) {
    console.error("Guest list response error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
