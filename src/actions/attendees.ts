"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { db } from "@/lib/db";
import { attendees } from "@/db/schema";
import { sendEmail } from "@/lib/email";
import { stackServerApp } from "@/stack";
import { eq, and } from "drizzle-orm";

const schema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.email(),
  phone: z.string().optional(),
  eventId: z.uuid(),
});

export async function registerAttendee(values: z.infer<typeof schema>) {
  const validated = schema.safeParse(values);

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

    await db.insert(attendees).values({
      eventId,
      userId: user?.id ?? null,
      name,
      email,
      phone,
    });
  } catch (error) {
    return { message: "Database error while registering." };
  }

  // Send confirmation email (non-blocking)
  try {
    await sendEmail({
      to: email,
      subject: "Event Registration Confirmation",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Registration Confirmed!</h2>
          <p>Hi ${firstName},</p>
          <p>Thank you for registering for our event! We're excited to have you join us.</p>
          <p>We look forward to seeing you there.</p>
          <br>
          <p>Best regards,<br>Event Management Team</p>
        </div>
      `,
    });
    console.log("✅ Confirmation email sent successfully to:", email);
  } catch (emailError: unknown) {
    const errorMessage =
      emailError instanceof Error ? emailError.message : String(emailError);
    if (errorMessage.includes("You can only send testing emails")) {
      console.log(
        "🔔 Development mode: Email would be sent to",
        email,
        "in production"
      );
      console.log(
        "📧 To test emails in development, add recipient to Resend dashboard or verify a domain"
      );
    } else {
      console.error("❌ Failed to send confirmation email:", emailError);
    }
    // Continue with registration even if email fails
  }

  revalidatePath(`/events/${eventId}/register`);
  redirect(`/events/${eventId}/register/thanks`);
}
