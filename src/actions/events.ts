"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { db } from "@/lib/db";
import { events } from "@/db/schema";
import { stackServerApp } from "@/stack";

const formSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  description: z.string().optional(),
  date: z.date(),
  location: z.string().optional(),
});

export async function createEvent(values: z.infer<typeof formSchema>) {
  const user = await stackServerApp.getUser();

  if (!user) {
    throw new Error("You must be logged in to create an event.");
  }

  const validatedFields = formSchema.safeParse(values);

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: "Missing Fields. Failed to Create Event.",
    };
  }

  const { name, description, date, location } = validatedFields.data;

  try {
    await db.insert(events).values({
      name,
      description,
      date,
      location,
      createdBy: user.id,
    });
  } catch (error) {
    return {
      message: "Database Error: Failed to Create Event.",
    };
  }

  revalidatePath("/dashboard/events");
  redirect("/dashboard/events");
}
