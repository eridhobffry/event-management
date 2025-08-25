import { db } from "@/lib/db";
import { attendees, events } from "@/db/schema";
import { eq, and, isNull, lt } from "drizzle-orm";
import { sendEmail } from "@/lib/email";

export interface RSVPAttendee {
  id: string;
  name: string;
  email: string;
  eventId: string;
  eventName: string;
  eventDate: Date;
  expiryDate: Date;
}

/**
 * Send RSVP confirmation email
 */
export async function sendRSVPConfirmation(attendee: RSVPAttendee) {
  const subject = `RSVP Confirmed: ${attendee.eventName}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #059669;">✅ RSVP Confirmed!</h2>
      
      <p>Hi ${attendee.name},</p>
      
      <p>You're all set for <strong>${attendee.eventName}</strong>!</p>
      
      <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p><strong>Event:</strong> ${attendee.eventName}</p>
        <p><strong>Date:</strong> ${attendee.eventDate.toLocaleDateString()}</p>
        <p><strong>Your Status:</strong> RSVP Confirmed (Free Entry)</p>
      </div>
      
      <p>This RSVP reserves your spot on the guest list. If you'd like to guarantee your attendance and support the event, consider purchasing a ticket.</p>
      
      <div style="margin: 30px 0;">
        <a href="${
          process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
        }/events/${attendee.eventId}/purchase" 
           style="background: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
          Purchase Tickets
        </a>
      </div>
      
      <p style="color: #6b7280; font-size: 14px;">
        Note: Free RSVPs expire in 48 hours if no ticket is purchased. This helps us manage capacity fairly.
      </p>
      
      <p>See you there!</p>
    </div>
  `;

  return sendEmail({
    to: attendee.email,
    subject,
    html,
  });
}

/**
 * Send 24-hour reminder to purchase tickets
 */
export async function sendRSVPReminder(attendee: RSVPAttendee) {
  const hoursLeft = Math.ceil(
    (attendee.expiryDate.getTime() - Date.now()) / (1000 * 60 * 60)
  );

  const subject = `⏰ RSVP expires in ${hoursLeft} hours - ${attendee.eventName}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #f59e0b;">⏰ RSVP Expiring Soon</h2>
      
      <p>Hi ${attendee.name},</p>
      
      <p>Your free RSVP for <strong>${
        attendee.eventName
      }</strong> expires in <strong>${hoursLeft} hours</strong>.</p>
      
      <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
        <p><strong>🎫 Secure your spot by purchasing a ticket</strong></p>
        <p>Tickets guarantee your attendance and help support the event organizers.</p>
      </div>
      
      <div style="margin: 30px 0;">
        <a href="${
          process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
        }/events/${attendee.eventId}/purchase" 
           style="background: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin-right: 10px;">
          Purchase Tickets
        </a>
        <a href="${
          process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
        }/events/${attendee.eventId}" 
           style="background: #6b7280; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
          Event Details
        </a>
      </div>
      
      <p style="color: #6b7280; font-size: 14px;">
        If you don't purchase a ticket, your RSVP will be automatically removed to make space for others.
      </p>
    </div>
  `;

  return sendEmail({
    to: attendee.email,
    subject,
    html,
  });
}

/**
 * Get attendees who need 24-hour reminders
 */
export async function getAttendeesNeedingReminders(): Promise<RSVPAttendee[]> {
  const reminderThreshold = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now

  const results = await db
    .select({
      id: attendees.id,
      name: attendees.name,
      email: attendees.email,
      eventId: attendees.eventId,
      eventName: events.name,
      eventDate: events.date,
      expiryDate: attendees.expiryDate,
    })
    .from(attendees)
    .innerJoin(events, eq(attendees.eventId, events.id))
    .where(
      and(
        eq(attendees.willAttend, true),
        isNull(attendees.rsvpReminderSent),
        lt(attendees.expiryDate, reminderThreshold)
      )
    );

  return results.map((row) => ({
    ...row,
    eventDate: new Date(row.eventDate!),
    expiryDate: row.expiryDate ? new Date(row.expiryDate) : new Date(),
  }));
}

/**
 * Mark reminder as sent
 */
export async function markReminderSent(attendeeId: string) {
  await db
    .update(attendees)
    .set({ rsvpReminderSent: new Date() })
    .where(eq(attendees.id, attendeeId));
}

/**
 * Clean up expired RSVPs
 */
export async function cleanupExpiredRSVPs(): Promise<number> {
  const result = await db
    .delete(attendees)
    .where(
      and(eq(attendees.willAttend, true), lt(attendees.expiryDate, new Date()))
    );

  return Array.isArray(result) ? result.length : 0;
}

/**
 * Send reminders and cleanup expired RSVPs - main function to run periodically
 */
export async function processRSVPMaintenance() {
  console.log("🔄 Starting RSVP maintenance...");

  // 1. Send 24-hour reminders
  const attendeesNeedingReminders = await getAttendeesNeedingReminders();
  console.log(
    `📧 Sending ${attendeesNeedingReminders.length} RSVP reminders...`
  );

  for (const attendee of attendeesNeedingReminders) {
    try {
      await sendRSVPReminder(attendee);
      await markReminderSent(attendee.id);
      console.log(`✅ Reminder sent to ${attendee.email}`);
    } catch (error) {
      console.error(`❌ Failed to send reminder to ${attendee.email}:`, error);
    }
  }

  // 2. Clean up expired RSVPs
  const cleanedCount = await cleanupExpiredRSVPs();
  console.log(`🗑️ Cleaned up ${cleanedCount} expired RSVPs`);

  console.log("✅ RSVP maintenance completed");

  return {
    remindersSent: attendeesNeedingReminders.length,
    rsvpsCleanedUp: cleanedCount,
  };
}
