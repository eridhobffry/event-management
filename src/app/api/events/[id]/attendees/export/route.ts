import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { attendees } from "@/db/schema";
import { and, desc, eq, isNotNull, isNull, sql } from "drizzle-orm";
import { stackServerApp } from "@/stack";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  // AuthN (align with dashboard pages)
  await stackServerApp.getUser({ or: "redirect" });

  const { id } = await context.params;
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") || "").trim().toLowerCase();
  const status = (searchParams.get("status") || "all") as
    | "all"
    | "checkedIn"
    | "pending";

  const filters = [eq(attendees.eventId, id)];
  if (q.length > 0) {
    const qLike = `%${q}%`;
    filters.push(
      sql`(lower(${attendees.name}) like ${qLike} or lower(${attendees.email}) like ${qLike})`
    );
  }
  if (status === "checkedIn") {
    filters.push(isNotNull(attendees.checkedIn));
  } else if (status === "pending") {
    filters.push(isNull(attendees.checkedIn));
  }

  const whereClause = and(...filters);

  const rows = await db
    .select({
      name: attendees.name,
      email: attendees.email,
      phone: attendees.phone,
      checkedIn: attendees.checkedIn,
      registeredAt: attendees.registeredAt,
    })
    .from(attendees)
    .where(whereClause)
    .orderBy(desc(attendees.registeredAt));

  const headers = [
    "Name",
    "Email",
    "Phone",
    "Status",
    "Registered Date",
    "Check-in Date",
  ];

  const csvLines = [
    headers.join(","),
    ...rows.map((r) => {
      const statusText = r.checkedIn ? "Checked In" : "Pending";
      const registeredDate = r.registeredAt
        ? new Date(r.registeredAt).toLocaleDateString()
        : "";
      const checkinDate = r.checkedIn
        ? new Date(r.checkedIn).toLocaleDateString()
        : "";
      return [
        `"${(r.name || "").replaceAll('"', '""')}"`,
        `"${(r.email || "").replaceAll('"', '""')}"`,
        `"${(r.phone || "").replaceAll('"', '""')}"`,
        `"${statusText}"`,
        `"${registeredDate}"`,
        `"${checkinDate}"`,
      ].join(",");
    }),
  ].join("\n");

  const today = new Date().toISOString().split("T")[0];
  const filename = `event_${id}_attendees_${today}.csv`;

  return new NextResponse(csvLines, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
