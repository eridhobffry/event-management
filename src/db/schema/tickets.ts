import { pgTable, uuid, text, timestamp, index, uniqueIndex } from "drizzle-orm/pg-core";
import { events } from "./events";
import { orders } from "./orders";
import { ticketTypes } from "./ticket_types";

export const tickets = pgTable(
  "tickets",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    eventId: uuid("event_id").notNull().references(() => events.id),
    orderId: uuid("order_id").references(() => orders.id, { onDelete: "set null" }),
    ticketTypeId: uuid("ticket_type_id").references(() => ticketTypes.id, {
      onDelete: "set null",
    }),
    attendeeName: text("attendee_name"),
    attendeeEmail: text("attendee_email"),
    qrCodeToken: uuid("qr_code_token").defaultRandom().notNull(),
    status: text("status").notNull().default("issued"),
    issuedAt: timestamp("issued_at", { withTimezone: true }).defaultNow(),
    checkedInAt: timestamp("checked_in_at", { withTimezone: true }),
  },
  (table) => {
    return {
      uidxQrToken: uniqueIndex("idx_tickets_qr_code_token").on(table.qrCodeToken),
      idxEventId: index("idx_tickets_event_id").on(table.eventId),
      idxStatus: index("idx_tickets_status").on(table.status),
    };
  }
);
