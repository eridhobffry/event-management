import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";

let migrationClient: ReturnType<typeof postgres>;
let db: PostgresJsDatabase;

if (!process.env.NEON_DATABASE_URL) {
  console.warn(
    "NEON_DATABASE_URL not set. Using in-memory mock database for local dev/tests."
  );

  // Minimal, predictable sample data for tests and local dev
  const sampleEvents = [
    {
      id: "00000000-0000-0000-0000-000000000001",
      name: "React Conference 2025",
      description:
        "The biggest React conference in Europe featuring top speakers.",
      date: new Date("2025-09-15T09:00:00Z"),
      location: "Berlin Convention Center, Germany",
      expectations: ["Talks", "Workshops"],
      createdAt: new Date(),
      createdBy: null,
      isActive: true,
    },
    {
      id: "00000000-0000-0000-0000-000000000002",
      name: "Digital Marketing Workshop",
      description: "Practical digital marketing strategies.",
      date: new Date("2025-08-12T10:00:00Z"),
      location: "Munich Business Center, Room 301",
      expectations: ["SEO", "Social Media"],
      createdAt: new Date(),
      createdBy: null,
      isActive: true,
    },
    {
      id: "00000000-0000-0000-0000-000000000003",
      name: "AI & Machine Learning Meetup",
      description: "Monthly meetup focusing on LLMs and applications.",
      date: new Date("2025-08-25T17:30:00Z"),
      location: "Frankfurt Tech Park, Building A",
      expectations: ["Talks", "Networking"],
      createdAt: new Date(),
      createdBy: null,
      isActive: true,
    },
  ];

  function makeWhereResult() {
    const promise = Promise.resolve(sampleEvents) as unknown as {
      then: Promise<typeof sampleEvents>["then"];
      limit: (n: number) => Promise<typeof sampleEvents>;
    };
    promise.limit = async (n: number) => sampleEvents.slice(0, n);
    return promise;
  }

  migrationClient = {} as unknown as ReturnType<typeof postgres>;
  db = {
    select: () => ({
      from: () => ({
        where: () => makeWhereResult(),
      }),
    }),
    insert: () => ({
      values: async () => void 0,
    }),
    update: () => ({
      set: () => ({ where: async () => void 0 }),
    }),
    delete: () => ({ where: async () => void 0 }),
  } as unknown as PostgresJsDatabase;
} else {
  // Connection pooling is handled by Neon's built-in pooling
  const connectionString = process.env.NEON_DATABASE_URL;

  // Connection options with better error handling and timeouts
  const connectionOptions = {
    ssl: {
      rejectUnauthorized: false, // Only for development!
    },
    max: 5, // Increase connection pool size
    idle_timeout: 20,
    max_lifetime: 60 * 30,
    connect_timeout: 10,
    connection: {
      application_name: "event-management-seed-script",
    },
  };

  console.log("Connecting to database...");
  console.log(`Database host: ${new URL(connectionString).hostname}`);

  // For migrations and queries
  migrationClient = postgres(connectionString, {
    ...connectionOptions,
    max: 1, // Single connection for migrations
  });

  // For query building
  const queryClient = postgres(connectionString, connectionOptions);

  db = drizzle(queryClient, {
    logger: {
      logQuery: (query: string, params: unknown[]) => {
        console.log("Executing query:", query);
        console.log("With params:", params);
      },
    },
  });
}

export { migrationClient, db };
