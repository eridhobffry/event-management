import { NextRequest, NextResponse } from "next/server";
import { processRSVPMaintenance } from "@/lib/rsvp-notifications";

// API endpoint for RSVP maintenance - to be called by cron jobs
export async function POST(request: NextRequest) {
  try {
    // Optional: Add authentication to prevent abuse
    const authHeader = request.headers.get("authorization");
    const expectedToken = process.env.CRON_SECRET || "dev-only-secret";

    if (authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await processRSVPMaintenance();

    return NextResponse.json({
      success: true,
      ...result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("RSVP maintenance failed:", error);
    return NextResponse.json(
      {
        error: "Maintenance failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// Allow GET for manual testing
export async function GET() {
  try {
    const result = await processRSVPMaintenance();

    return NextResponse.json({
      success: true,
      ...result,
      timestamp: new Date().toISOString(),
      note: "Manual execution - use POST with authorization for production",
    });
  } catch (error) {
    console.error("RSVP maintenance failed:", error);
    return NextResponse.json(
      {
        error: "Maintenance failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
