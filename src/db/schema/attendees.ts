import { pgTable, uuid, text, timestamp, unique } from "drizzle-orm/pg-core";
import { events } from "./events";
import { users } from "./users";

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
    checkedIn: timestamp("checked_in", { withTimezone: true }),
    registeredAt: timestamp("registered_at", {
      withTimezone: true,
    }).defaultNow(),
  },
  (table) => ({
    unq: unique().on(table.eventId, table.email),
  })
);
