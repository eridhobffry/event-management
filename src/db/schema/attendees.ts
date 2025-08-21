import {
  pgTable,
  uuid,
  text,
  timestamp,
  unique,
  boolean,
  index,
} from "drizzle-orm/pg-core";
import { events } from "./events";
import { users } from "./users";
import { sql } from "drizzle-orm";

export const attendees = pgTable(
  "attendees",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id),
    userId: text("user_id").references(() => users.id),
    name: text("name").notNull(),
    email: text("email").notNull(),
    phone: text("phone"),
    checkedIn: timestamp("checked_in", { withTimezone: true }),
    registeredAt: timestamp("registered_at", {
      withTimezone: true,
    }).defaultNow(),
    // RSVP management fields
    rsvpReminderSent: timestamp("rsvp_reminder_sent", { withTimezone: true }),
    willAttend: boolean("will_attend").default(true),
    expiryDate: timestamp("expiry_date", { withTimezone: true }).default(
      sql`now() + interval '48 hours'`
    ),
  },
  (table) => ({
    unq: unique().on(table.eventId, table.email),
    // Index for RSVP cleanup and reminders
    expiryReminderIdx: index("idx_attendees_expiry_reminder").on(
      table.expiryDate,
      table.rsvpReminderSent
    ),
  })
);
