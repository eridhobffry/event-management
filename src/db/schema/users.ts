import { pgSchema, text } from "drizzle-orm/pg-core";

export const neonAuthSchema = pgSchema("neon_auth");

export const users = neonAuthSchema.table("users_sync", {
  id: text("id").primaryKey(),
  email: text("email"),
});
