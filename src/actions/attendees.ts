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

// Public server action: Resend RSVP confirmation for an existing registration.
// Always returns a generic success message to avoid leaking whether a registration exists.
export async function resendRSVPConfirmation(input: {
  eventId: string;
  email: string;
}) {
  try {
    const eventId = input?.eventId?.trim();
    const normalizedEmail = input?.email?.trim().toLowerCase();
    if (!eventId || !normalizedEmail) {
      return { success: false as const, message: "Missing fields." };
    }

    type AttendeeLite = { id: string; name: string | null; email: string | null; eventId?: string };
    let match: AttendeeLite | undefined;

    if (!process.env.NEON_DATABASE_URL) {
      const all = (await db.select().from(attendees)) as unknown as AttendeeLite[];
      match = all.find(
        (a) =>
          a?.eventId === eventId &&
          typeof a?.email === "string" &&
          a.email.trim().toLowerCase() === normalizedEmail
      );
    } else {
      const found = await db
        .select({ id: attendees.id, name: attendees.name, email: attendees.email })
        .from(attendees)
        .where(
          and(
            eq(attendees.eventId, eventId),
            sql`lower(${attendees.email}) = ${normalizedEmail}`
          )
        )
        .limit(1);
      match = found?.[0] as unknown as AttendeeLite | undefined;
    }

    // Fetch event details regardless; if either fails, we still return success generically
    const eventDetails = await db
      .select({ name: events.name, date: events.date })
      .from(events)
      .where(eq(events.id, eventId))
      .limit(1);

    if (match && eventDetails[0]) {
      await sendRSVPConfirmation({
        id: match.id,
        name: match.name ?? "Attendee",
        email: normalizedEmail,
        eventId,
        eventName: eventDetails[0].name,
        eventDate: new Date(eventDetails[0].date!),
        expiryDate: new Date(Date.now() + 48 * 60 * 60 * 1000),
      });
    }

    return {
      success: true as const,
      // 'resent' is informational; the client may ignore it to avoid enumeration
      resent: Boolean(match),
      message: "If a registration exists for this email, we’ve resent the confirmation.",
    };
  } catch (error) {
    console.error("Error while resending RSVP confirmation:", error);
    // Generic error to avoid leaking info
    return { success: true as const, message: "If a registration exists for this email, we’ve resent the confirmation." };
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

  const { firstName, lastName, eventId, phone } = validated.data;
  const normalizedEmail = validated.data.email.trim().toLowerCase();
  const name = `${firstName} ${lastName}`.trim();

  // If logged in, attach userId
  const user = await stackServerApp.getUser().catch(() => null);

  let createdAttendeeId: string | null = null;
  try {
    // Ensure event exists to avoid FK errors
    const eventExists = await db
      .select({ id: events.id })
      .from(events)
      .where(eq(events.id, eventId))
      .limit(1);
    if (!eventExists?.[0]) {
      return { message: "Event not found. Please check the link and try again." };
    }

    // prevent duplicate registration
    // In local mock DB (when NEON_DATABASE_URL is not set), `.where()` does not filter.
    // Workaround: fetch and filter in-memory in mock mode; use proper WHERE in real DB.
    let existing: unknown[] = [];
    if (!process.env.NEON_DATABASE_URL) {
      const all = (await db.select().from(attendees)) as unknown as {
        eventId?: string;
        email?: string;
      }[];
      existing = all.filter(
        (a) =>
          a?.eventId === eventId &&
          typeof a?.email === "string" &&
          a.email.trim().toLowerCase() === normalizedEmail
      );
    } else {
      existing = await db
        .select()
        .from(attendees)
        .where(
          and(
            eq(attendees.eventId, eventId),
            // case-insensitive match on email
            sql`lower(${attendees.email}) = ${normalizedEmail}`
          )
        )
        .limit(1);
    }

    if ((existing as unknown[]).length > 0) {
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
        email: normalizedEmail,
        phone,
      })
      .returning({ id: attendees.id });

    if (inserted?.[0]?.id) {
      createdAttendeeId = inserted[0].id;
    }
  } catch (err) {
    console.error("❌ DB insert failed in registerAttendee", {
      eventId,
      normalizedEmail,
      name,
      userId: user?.id ?? null,
      error: err,
    });
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
        email: normalizedEmail,
        eventId,
        eventName: eventDetails[0].name,
        eventDate: new Date(eventDetails[0].date!),
        expiryDate: new Date(Date.now() + 48 * 60 * 60 * 1000), // 48 hours from now
      });
      console.log("✅ RSVP confirmation email sent successfully to:", normalizedEmail);
    }
  } catch (emailError: unknown) {
    console.error("❌ Failed to send RSVP confirmation email:", emailError);
    // Continue with registration even if email fails
  }

  revalidatePath(`/events/${eventId}/register`);

  // Return success to allow component to show animation before redirect
  return { success: true, eventId, attendeeId: createdAttendeeId };
}
