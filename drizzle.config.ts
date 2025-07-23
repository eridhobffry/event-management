import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/db/schema/*",
  out: "./src/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url:
      process.env.NEON_DATABASE_URL ||
      "postgresql://neondb_owner:npg_SZy1ukJqb3Pm@ep-jolly-surf-a9fejabp-pooler.gwc.azure.neon.tech/neondb?sslmode=require&channel_binding=require",
  },
  verbose: true,
  strict: true,
});
