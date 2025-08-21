import { pgSchema, text } from "drizzle-orm/pg-core";

export const neonAuthSchema = pgSchema("neon_auth");

// Map to a writable view that forwards inserts into the underlying
// neon_auth.users_sync table by constructing raw_json. This avoids
// inserting into generated columns directly.
export const users = neonAuthSchema.table("users_sync_write", {
  id: text("id").primaryKey(),
  email: text("email"),
});
