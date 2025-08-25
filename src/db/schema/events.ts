import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  json,
} from "drizzle-orm/pg-core";
import { usersBase } from "./users";

export const events = pgTable("events", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  date: timestamp("date", { withTimezone: true }),
  location: text("location"),
  expectations: json("expectations").$type<string[]>().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  createdBy: text("created_by").references(() => usersBase.id),
  isActive: boolean("is_active").default(true),
});
