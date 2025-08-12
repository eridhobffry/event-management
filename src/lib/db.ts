import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

if (!process.env.NEON_DATABASE_URL) {
  throw new Error("NEON_DATABASE_URL environment variable is not set");
}

// Connection pooling is handled by Neon's built-in pooling
const connectionString = process.env.NEON_DATABASE_URL;

// Connection options with better error handling and timeouts
const connectionOptions = {
  ssl: {
    rejectUnauthorized: false // Only for development!
  },
  max: 5, // Increase connection pool size
  idle_timeout: 20,
  max_lifetime: 60 * 30,
  connect_timeout: 10,
  connection: {
    application_name: 'event-management-seed-script'
  }
};

console.log("Connecting to database...");
console.log(`Database host: ${new URL(connectionString).hostname}`);

// For migrations and queries
export const migrationClient = postgres(connectionString, {
  ...connectionOptions,
  max: 1, // Single connection for migrations
});

// For query building
const queryClient = postgres(connectionString, connectionOptions);

export const db = drizzle(queryClient, {
  logger: {
    logQuery: (query: string, params: unknown[]) => {
      console.log("Executing query:", query);
      console.log("With params:", params);
    },
  },
});
