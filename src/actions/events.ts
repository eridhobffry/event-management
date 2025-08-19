"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { db } from "@/lib/db";
import { events, ticketTypes } from "@/db/schema";
import { stackServerApp } from "@/stack";
import { eq, and } from "drizzle-orm";
import { eventFormSchema, type EventFormInput } from "@/schemas/events";
import type { UITicketType } from "@/types/payments";

export async function createEvent(values: EventFormInput) {
  const user = await stackServerApp.getUser();

  if (!user) {
    redirect("/handler/sign-in");
  }

  const validatedFields = eventFormSchema.safeParse(values);

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: "Missing Fields. Failed to Create Event.",
    };
  }

  const { name, description, date, location, expectations } =
    validatedFields.data;

  const expectationsArray = expectations
    ? expectations
        .split("\n")
        .map((e) => e.trim())
        .filter(Boolean)
    : [];

  try {
    await db.insert(events).values({
      name,
      description,
      date,
      location,
      expectations: expectationsArray,
      createdBy: user.id,
    });
  } catch {
    return {
      message: "Database Error: Failed to Create Event.",
    };
  }

  revalidatePath("/dashboard/events");
  redirect("/dashboard/events");
}

export async function updateEvent(id: string, values: EventFormInput) {
  const user = await stackServerApp.getUser();

  if (!user) {
    redirect("/handler/sign-in");
  }

  const validatedFields = eventFormSchema.safeParse(values);

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: "Missing Fields. Failed to Update Event.",
    };
  }

  const { name, description, date, location, expectations } =
    validatedFields.data;

  const expectationsArray = expectations
    ? expectations
        .split("\n")
        .map((e) => e.trim())
        .filter(Boolean)
    : [];

  try {
    await db
      .update(events)
      .set({
        name,
        description,
        date,
        location,
        expectations: expectationsArray,
      })
      .where(eq(events.id, id));
  } catch {
    return {
      message: "Database Error: Failed to Update Event.",
    };
  }

  revalidatePath("/dashboard/events");
  redirect("/dashboard/events");
}

export async function deleteEvent(id: string) {
  const user = await stackServerApp.getUser();

  if (!user) {
    throw new Error("You must be logged in to delete an event.");
  }

  try {
    await db.delete(events).where(eq(events.id, id));
  } catch {
    return {
      message: "Database Error: Failed to Delete Event.",
    };
  }

  revalidatePath("/dashboard/events");
}

// Read helper: fetch an active event and its active ticket types, mapped for UI
type EventRow = typeof events.$inferSelect;
export async function getEventAndActiveTicketTypes(
  eventId: string
): Promise<{ event: EventRow; ticketTypes: UITicketType[] } | null> {
  const [event] = await db
    .select()
    .from(events)
    .where(eq(events.id, eventId))
    .limit(1);

  if (!event || !event.isActive) return null;

  const rows = await db
    .select({
      id: ticketTypes.id,
      name: ticketTypes.name,
      priceCents: ticketTypes.priceCents,
      currency: ticketTypes.currency,
      quantityTotal: ticketTypes.quantityTotal,
      quantitySold: ticketTypes.quantitySold,
      isActive: ticketTypes.isActive,
    })
    .from(ticketTypes)
    .where(and(eq(ticketTypes.eventId, eventId), eq(ticketTypes.isActive, true)));

  const mapped: UITicketType[] = rows
    .map((r) => ({
      id: r.id,
      name: r.name,
      priceCents: r.priceCents,
      currency: r.currency,
      available: Math.max(0, (r.quantityTotal ?? 0) - (r.quantitySold ?? 0)),
    }))
    .filter((t) => t.available > 0);

  return { event, ticketTypes: mapped };
}
