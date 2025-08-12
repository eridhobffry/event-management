import type { events } from "@/db/schema/events";
import type { attendees } from "@/db/schema/attendees";
import type { users } from "@/db/schema/users";

export type Event = typeof events.$inferSelect;
export type NewEvent = typeof events.$inferInsert;

export type Attendee = typeof attendees.$inferSelect;
export type NewAttendee = typeof attendees.$inferInsert;

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
