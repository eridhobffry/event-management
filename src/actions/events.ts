"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { db } from "@/lib/db";
import { events } from "@/db/schema";
import { stackServerApp } from "@/stack";
import { eq } from "drizzle-orm";
import { eventFormSchema, type EventFormInput } from "@/schemas/events";

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
