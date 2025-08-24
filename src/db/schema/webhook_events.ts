import { pgTable, uuid, text, timestamp, jsonb, uniqueIndex } from "drizzle-orm/pg-core";

// Stores incoming webhook events for idempotency and debugging
export const webhookEvents = pgTable(
  "webhook_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    provider: text("provider").notNull(), // e.g., 'paypal', 'stripe'
    providerEventId: text("provider_event_id").notNull(),
    payload: jsonb("payload"),
    status: text("status"), // e.g., 'received', 'processed', 'failed'
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    uidxProviderEvent: uniqueIndex("uidx_webhook_provider_event").on(
      table.provider,
      table.providerEventId
    ),
  })
);
