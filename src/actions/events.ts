"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { db } from "@/lib/db";
import { events } from "@/db/schema";
import { stackServerApp } from "@/stack";
import { eq } from "drizzle-orm";

const formSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  description: z.string().optional(),
  date: z.date(),
  location: z.string().optional(),
  expectations: z.string().optional(),
});

export async function createEvent(values: z.infer<typeof formSchema>) {
  const user = await stackServerApp.getUser();

  if (!user) {
    redirect("/handler/sign-in");
  }

  const validatedFields = formSchema.safeParse(values);

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

export async function updateEvent(
  id: string,
  values: z.infer<typeof formSchema>
) {
  const user = await stackServerApp.getUser();

  if (!user) {
    redirect("/handler/sign-in");
  }

  const validatedFields = formSchema.safeParse(values);

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
