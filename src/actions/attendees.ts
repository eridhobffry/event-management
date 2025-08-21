"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
// import { redirect } from "next/navigation"; // Removed redirect as we now return success status

import { db } from "@/lib/db";
import { attendees, events } from "@/db/schema";
import { sendRSVPConfirmation } from "@/lib/rsvp-notifications";
import { stackServerApp } from "@/stack";
import { eq, and, desc, isNull, isNotNull, count, sql } from "drizzle-orm";
import {
  attendeeRegisterSchema,
  type AttendeeRegisterInput,
} from "@/schemas/attendees";

// Get attendees for a specific event (for event owners)
export async function getEventAttendees(eventId: string) {
  // Verify user is authenticated
  await stackServerApp.getUser({ or: "redirect" });

  try {
    const eventAttendees = await db
      .select({
        id: attendees.id,
        name: attendees.name,
        email: attendees.email,
        phone: attendees.phone,
        userId: attendees.userId,
        checkedIn: attendees.checkedIn,
        registeredAt: attendees.registeredAt,
      })
      .from(attendees)
      .where(eq(attendees.eventId, eventId))
      .orderBy(desc(attendees.registeredAt));

    return { success: true, attendees: eventAttendees };
  } catch (error) {
    console.error("Error fetching event attendees:", error);
    return { success: false, message: "Failed to fetch attendees" };
  }
}

export async function listAttendeesByEventId(
  eventId: string,
  options?: {
    q?: string;
    status?: "all" | "checkedIn" | "pending";
    page?: number;
    pageSize?: number;
  }
) {
  await stackServerApp.getUser({ or: "redirect" });

  const q = options?.q?.trim() ?? "";
  const status = options?.status ?? "all";
  const page = Math.max(1, options?.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, options?.pageSize ?? 25));

  // Build filters
  const filters = [eq(attendees.eventId, eventId)];
  if (q.length > 0) {
    const qLike = `%${q.toLowerCase()}%`;
    // Use SQL template to avoid dialect-specific helpers causing undefined types
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

  try {
    const [{ value: total }] = await db
      .select({ value: count() })
      .from(attendees)
      .where(whereClause);

    const rows = await db
      .select({
        id: attendees.id,
        name: attendees.name,
        email: attendees.email,
        phone: attendees.phone,
        userId: attendees.userId,
        checkedIn: attendees.checkedIn,
        registeredAt: attendees.registeredAt,
      })
      .from(attendees)
      .where(whereClause)
      .orderBy(desc(attendees.registeredAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    return {
      success: true as const,
      attendees: rows,
      total,
      page,
      pageSize,
    };
  } catch (error) {
    console.error("Error listing event attendees:", error);
    return { success: false as const, message: "Failed to list attendees" };
  }
}

export async function registerAttendee(values: AttendeeRegisterInput) {
  const validated = attendeeRegisterSchema.safeParse(values);

  if (!validated.success) {
    return {
      errors: z.treeifyError(validated.error).errors,
      message: "Missing or invalid fields.",
    };
  }

  const { firstName, lastName, email, eventId, phone } = validated.data;
  const name = `${firstName} ${lastName}`.trim();

  // If logged in, attach userId
  const user = await stackServerApp.getUser().catch(() => null);

  let createdAttendeeId: string | null = null;
  try {
    // prevent duplicate registration
    const existing = await db
      .select()
      .from(attendees)
      .where(and(eq(attendees.eventId, eventId), eq(attendees.email, email)))
      .limit(1);

    if (existing.length > 0) {
      return {
        message: "You have already registered for this event with this email.",
      };
    }

    const inserted = await db
      .insert(attendees)
      .values({
        eventId,
        userId: user?.id ?? null,
        name,
        email,
        phone,
      })
      .returning({ id: attendees.id });

    if (inserted?.[0]?.id) {
      createdAttendeeId = inserted[0].id;
    }
  } catch {
    return { message: "Database error while registering." };
  }

  // Send RSVP confirmation email (non-blocking)
  try {
    // Get event details for the email
    const eventDetails = await db
      .select({
        name: events.name,
        date: events.date,
      })
      .from(events)
      .where(eq(events.id, eventId))
      .limit(1);

    if (eventDetails[0] && createdAttendeeId) {
      await sendRSVPConfirmation({
        id: createdAttendeeId,
        name,
        email,
        eventId,
        eventName: eventDetails[0].name,
        eventDate: new Date(eventDetails[0].date!),
        expiryDate: new Date(Date.now() + 48 * 60 * 60 * 1000), // 48 hours from now
      });
      console.log("✅ RSVP confirmation email sent successfully to:", email);
    }
  } catch (emailError: unknown) {
    console.error("❌ Failed to send RSVP confirmation email:", emailError);
    // Continue with registration even if email fails
  }

  revalidatePath(`/events/${eventId}/register`);

  // Return success to allow component to show animation before redirect
  return { success: true, eventId, attendeeId: createdAttendeeId };
}
