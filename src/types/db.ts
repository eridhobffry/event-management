import type { events } from "@/db/schema/events";
import type { attendees } from "@/db/schema/attendees";
import type { users } from "@/db/schema/users";
import type { orders } from "@/db/schema/orders";
import type { orderItems } from "@/db/schema/order_items";
import type { ticketTypes } from "@/db/schema/ticket_types";
import type { tickets } from "@/db/schema/tickets";

export type Event = typeof events.$inferSelect;
export type NewEvent = typeof events.$inferInsert;

export type Attendee = typeof attendees.$inferSelect;
export type NewAttendee = typeof attendees.$inferInsert;

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Order = typeof orders.$inferSelect;
export type NewOrder = typeof orders.$inferInsert;

export type OrderItem = typeof orderItems.$inferSelect;
export type NewOrderItem = typeof orderItems.$inferInsert;

export type TicketType = typeof ticketTypes.$inferSelect;
export type NewTicketType = typeof ticketTypes.$inferInsert;

export type Ticket = typeof tickets.$inferSelect;
export type NewTicket = typeof tickets.$inferInsert;
