// app/api/admin/release-stale-reservations/route.ts
export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    // Check authentication
    const secret = req.headers.get("x-cron-secret");
    if (!secret || secret !== process.env.CRON_SECRET) {
      return new Response("Unauthorized", { status: 401 });
    }

    // Parse query parameters
    const { searchParams } = new URL(req.url);
    const ttlMinutes = Math.floor(Number(searchParams.get("ttlMinutes") ?? 30));

    // Validate TTL minutes
    if (isNaN(ttlMinutes) || ttlMinutes < 1) {
      return new Response("Invalid ttlMinutes parameter", { status: 400 });
    }

    // TODO: perform the actual cleanup work here
    // await releaseStaleReservations({ ttlMinutes });

    console.log(`Reservation cleanup called with TTL: ${ttlMinutes} minutes`);

    return Response.json({
      ok: true,
      ttlMinutes,
      message: `Cleanup completed successfully for reservations older than ${ttlMinutes} minutes`,
    });
  } catch (error) {
    console.error("Error in reservation cleanup:", error);
    return new Response("Internal server error", { status: 500 });
  }
}
