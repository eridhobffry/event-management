import { pgTable, uuid, integer, index, check } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { orders } from "./orders";
import { ticketTypes } from "./ticket_types";

export const orderItems = pgTable(
  "order_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orderId: uuid("order_id").notNull().references(() => orders.id, {
      onDelete: "cascade",
    }),
    ticketTypeId: uuid("ticket_type_id")
      .notNull()
      .references(() => ticketTypes.id, { onDelete: "restrict" }),
    quantity: integer("quantity").notNull(),
    unitPriceCents: integer("unit_price_cents").notNull(),
  },
  (table) => {
    return {
      idxOrderId: index("idx_order_items_order_id").on(table.orderId),
      idxTicketTypeId: index("idx_order_items_ticket_type_id").on(
        table.ticketTypeId
      ),
      ckQuantityPositive: check(
        "ck_order_items_quantity_positive",
        sql`${table.quantity} > 0`
      ),
    };
  }
);
