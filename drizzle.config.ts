import type { Config } from "drizzle-kit";

export default {
  schema: "./src/db/schema/*",
  out: "./src/db/migrations",
  driver: "pg", // PostgreSQL driver
  connectionString:
    process.env.DATABASE_URL ||
    "postgresql://neondb_owner:npg_SZy1ukJqb3Pm@ep-jolly-surf-a9fejabp-pooler.gwc.azure.neon.tech/neondb?sslmode=require&channel_binding=require",
  verbose: true,
  strict: true,
} satisfies Config;
