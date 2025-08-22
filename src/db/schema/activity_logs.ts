import { pgTable, uuid, text, jsonb, timestamp } from "drizzle-orm/pg-core";
import { usersBase } from "./users";

export const activityLogs = pgTable("activity_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").references(() => usersBase.id),
  action: text("action").notNull(),
  details: jsonb("details"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});
