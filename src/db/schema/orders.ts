import { pgTable, uuid, text, integer, timestamp, index, uniqueIndex } from "drizzle-orm/pg-core";
import { events } from "./events";

export const orders = pgTable(
  "orders",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    eventId: uuid("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    amountTotalCents: integer("amount_total_cents").notNull(),
    currency: text("currency").notNull().default("usd"),
    status: text("status").notNull().default("pending"),
    paymentIntentId: text("payment_intent_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (table) => {
    return {
      idxEventId: index("idx_orders_event_id").on(table.eventId),
      idxStatus: index("idx_orders_status").on(table.status),
      uidxPaymentIntent: uniqueIndex("idx_orders_payment_intent_id").on(
        table.paymentIntentId
      ),
    };
  }
);
