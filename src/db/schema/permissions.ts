import { pgTable, text, serial } from "drizzle-orm/pg-core";

export const permissions = pgTable("permissions", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description"),
});
