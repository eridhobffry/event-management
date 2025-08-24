import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { guestListRequests } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const attendeeId = searchParams.get("attendeeId");

    if (!attendeeId) {
      return NextResponse.json(
        { error: "Attendee ID is required" },
        { status: 400 }
      );
    }

    // Get guest list request status
    const guestRequest = await db.query.guestListRequests.findFirst({
      where: eq(guestListRequests.attendeeId, attendeeId),
      orderBy: (guestListRequests, { desc }) => [
        desc(guestListRequests.requestedAt),
      ],
    });

    if (!guestRequest) {
      return NextResponse.json({
        hasRequest: false,
        status: null,
      });
    }

    return NextResponse.json({
      hasRequest: true,
      status: guestRequest.status,
      requestedAt: guestRequest.requestedAt,
      reviewedAt: guestRequest.reviewedAt,
      reviewNotes: guestRequest.reviewNotes,
    });
  } catch (error) {
    console.error("Guest list status error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
