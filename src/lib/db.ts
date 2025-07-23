import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

// Connection pooling is handled by Neon's built-in pooling
const connectionString =
  process.env.NEON_DATABASE_URL ||
  "postgresql://neondb_owner:npg_SZy1ukJqb3Pm@ep-jolly-surf-a9fejabp-pooler.gwc.azure.neon.tech/neondb?sslmode=require&channel_binding=require";

// For migrations and queries with SSL required
export const migrationClient = postgres(connectionString, {
  max: 1,
  ssl: "require",
});

// For query building with SSL required
const queryClient = postgres(connectionString, {
  ssl: "require",
});
export const db = drizzle(queryClient);
