import {
  pgTable,
  uuid,
  text,
  timestamp,
  index,
  unique,
} from "drizzle-orm/pg-core";
import { events } from "./events";
import { users } from "./users";

export const proactiveGuestList = pgTable(
  "proactive_guest_list",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    guestEmail: text("guest_email").notNull(),
    guestName: text("guest_name").notNull(),
    guestTitle: text("guest_title"), // e.g., "VIP", "Speaker", "Sponsor"
    personalMessage: text("personal_message"), // Custom message for this guest
    addedBy: text("added_by")
      .notNull()
      .references(() => users.id),
    status: text("status").notNull().default("active"), // active, archived, inactive
    qrCodeToken: uuid("qr_code_token").defaultRandom().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    notificationSent: timestamp("notification_sent", { withTimezone: true }),
    lastUsed: timestamp("last_used", { withTimezone: true }), // When QR was last scanned
  },
  (table) => ({
    // Unique constraint: one guest per event
    unqEventGuest: unique("unq_proactive_guest_list_event_guest").on(
      table.eventId,
      table.guestEmail
    ),
    // Indexes for performance
    idxEventId: index("idx_proactive_guest_list_event_id").on(table.eventId),
    idxGuestEmail: index("idx_proactive_guest_list_guest_email").on(
      table.guestEmail
    ),
    idxStatus: index("idx_proactive_guest_list_status").on(table.status),
    idxQrToken: index("idx_proactive_guest_list_qr_token").on(
      table.qrCodeToken
    ),
    idxCreatedAt: index("idx_proactive_guest_list_created_at").on(
      table.createdAt
    ),
  })
);
