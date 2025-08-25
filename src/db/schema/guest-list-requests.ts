import { pgTable, uuid, text, timestamp, index } from "drizzle-orm/pg-core";
import { events } from "./events";
import { attendees } from "./attendees";
import { usersBase } from "./users";

export const guestListRequests = pgTable(
  "guest_list_requests",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    attendeeId: uuid("attendee_id")
      .notNull()
      .references(() => attendees.id, { onDelete: "cascade" }),
    requesterId: text("requester_id").references(() => usersBase.id),
    requesterEmail: text("requester_email").notNull(),
    requesterName: text("requester_name").notNull(),
    reason: text("reason"), // Optional reason why they want to be on guest list
    status: text("status").notNull().default("pending"), // pending, approved, rejected
    reviewedBy: text("reviewed_by").references(() => usersBase.id),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    reviewNotes: text("review_notes"), // Optional notes from organizer
    qrCodeToken: uuid("qr_code_token").defaultRandom(), // Generated when approved
    requestedAt: timestamp("requested_at", { withTimezone: true }).defaultNow(),
    notificationSent: timestamp("notification_sent", { withTimezone: true }),
  },
  (table) => ({
    // Indexes for performance
    idxEventId: index("idx_guest_list_requests_event_id").on(table.eventId),
    idxStatus: index("idx_guest_list_requests_status").on(table.status),
    idxAttendeeId: index("idx_guest_list_requests_attendee_id").on(
      table.attendeeId
    ),
    idxRequestedAt: index("idx_guest_list_requests_requested_at").on(
      table.requestedAt
    ),
  })
);

