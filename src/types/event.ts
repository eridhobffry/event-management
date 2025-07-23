import type { events as eventsTable } from "@/db/schema/events";

export type Event = typeof eventsTable.$inferSelect;
export type NewEvent = typeof eventsTable.$inferInsert;

// For dynamic "What to Expect" content (Step 2-C)
export interface EventExpectation {
  id: string;
  text: string;
  icon?: string;
}

// For attendee registration (Step 2-D)
export interface AttendeeRegistration {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  eventId: string;
}
