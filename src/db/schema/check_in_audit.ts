import { pgTable, uuid, text, timestamp, index } from "drizzle-orm/pg-core";
import { events } from "./events";
import { usersBase } from "./users";

// Records every check-in and undo action for tickets and guest list entries
export const checkInAudit = pgTable(
  "check_in_audit",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    eventId: uuid("event_id").notNull().references(() => events.id),
    entityType: text("entity_type").notNull(), // 'ticket' | 'guest'
    entityId: uuid("entity_id").notNull(),
    actorUserId: text("actor_user_id").references(() => usersBase.id),
    actorRole: text("actor_role"),
    action: text("action").notNull(), // 'check_in' | 'undo'
    reason: text("reason"),
    source: text("source"), // 'scanner' | 'manual' | 'api'
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    idxEvent: index("idx_check_in_audit_event_id").on(table.eventId),
    idxEntity: index("idx_check_in_audit_entity").on(table.entityType, table.entityId),
    idxAction: index("idx_check_in_audit_action").on(table.action),
    idxCreatedAt: index("idx_check_in_audit_created_at").on(table.createdAt),
  })
);

