/* eslint-disable @typescript-eslint/no-explicit-any */
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { randomUUID } from "node:crypto";
import * as schema from "@/db/schema";
import {
  events,
  attendees,
  users,
  guestListRequests,
  proactiveGuestList,
} from "@/db/schema";

let migrationClient: ReturnType<typeof postgres>;
let db: PostgresJsDatabase<typeof schema>;

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

  // Mock database storage
  const mockStorage = {
    events: [...sampleEvents],
    attendees: [] as unknown[],
    users: [] as unknown[],
    guestListRequests: [] as unknown[],
    proactiveGuestList: [] as unknown[],
    tickets: [] as unknown[],
    checkInAudit: [] as unknown[],
  };

  function createMockInsertQuery(tableName: keyof typeof mockStorage) {
    return {
      values: (values: any) => {
        const valuesMethod = {
          then: async (resolve: (data: any) => void) => {
            const records = Array.isArray(values) ? values : [values];
            const insertedRecords = records.map((item: any) => {
              const id = item.id || randomUUID();
              const now = new Date();
              const newRecord: any = {
                ...item,
                id,
                createdAt: item.createdAt || now,
              };
              if (tableName === "attendees") {
                newRecord.registeredAt = item.registeredAt || now;
              }
              if (tableName === "guestListRequests") {
                newRecord.requestedAt = item.requestedAt || now;
                newRecord.status = item.status || "pending";
              }
              if (tableName === "proactiveGuestList") {
                newRecord.status = item.status || "active";
                newRecord.qrCodeToken = item.qrCodeToken || randomUUID();
              }
              mockStorage[tableName].push(newRecord);
              return newRecord;
            });
            resolve(insertedRecords);
            return insertedRecords;
          },
          returning: (_fields?: any) => ({
            then: async (resolve: (data: any) => void) => {
              void _fields;
              const records = Array.isArray(values) ? values : [values];
              const insertedRecords = records.map((item: any) => {
                const id = item.id || randomUUID();
                const now = new Date();
                const newRecord: any = {
                  ...item,
                  id,
                  createdAt: item.createdAt || now,
                };
                if (tableName === "attendees") {
                  newRecord.registeredAt = item.registeredAt || now;
                }
                if (tableName === "guestListRequests") {
                  newRecord.requestedAt = item.requestedAt || now;
                  newRecord.status = item.status || "pending";
                }
                if (tableName === "proactiveGuestList") {
                  newRecord.status = item.status || "active";
                  newRecord.qrCodeToken = item.qrCodeToken || randomUUID();
                }
                mockStorage[tableName].push(newRecord);
                return newRecord;
              });
              resolve(insertedRecords);
              return insertedRecords;
            },
          }),
        };
        return valuesMethod;
      },
    };
  }

  function createMockSelectQuery(tableName?: keyof typeof mockStorage) {
    const data = tableName ? mockStorage[tableName] : mockStorage.events;
    return {
      from: (table: any) => createMockFromQuery(getTableName(table)),
      where: (_condition: any) => {
        void _condition;
        return {
          limit: (n: number) => Promise.resolve(data.slice(0, n)),
          then: (resolve: (data: any) => void) => resolve(data),
        };
      },
      limit: (n: number) => Promise.resolve(data.slice(0, n)),
      then: (resolve: (data: any) => void) => resolve(data),
    };
  }

  function createMockFromQuery(tableName: keyof typeof mockStorage) {
    const data = mockStorage[tableName];
    return {
      where: (_condition: any) => {
        void _condition;
        return {
          limit: (n: number) => Promise.resolve(data.slice(0, n)),
          orderBy: (..._args: any[]) => {
            void _args;
            return Promise.resolve(data);
          },
          then: (resolve: (data: any) => void) => resolve(data),
        };
      },
      innerJoin: (_table: any, _condition: any) => {
        void _table;
        void _condition;
        return {
          where: (_condition2: any) => {
            void _condition2;
            return {
              orderBy: (..._args: any[]) => {
                void _args;
                return Promise.resolve([]);
              },
              then: (resolve: (data: any) => void) => resolve([]),
            };
          },
          orderBy: (..._args: any[]) => {
            void _args;
            return Promise.resolve([]);
          },
          then: (resolve: (data: any) => void) => resolve([]),
        };
      },
      then: (resolve: (data: any) => void) => resolve(data),
    };
  }

  function createMockDeleteQuery(tableName: keyof typeof mockStorage) {
    return {
      where: async (_condition?: any) => {
        void _condition;
        mockStorage[tableName].length = 0;
        return;
      },
      then: async (resolve: (data: any) => void) => {
        mockStorage[tableName].length = 0;
        resolve(undefined);
      },
    };
  }

  function getTableName(table: any): keyof typeof mockStorage {
    // Simple string-based matching for Drizzle table objects
    const tableStr = table?.toString?.() || "";
    if (tableStr.includes("events") || table === events) return "events";
    if (tableStr.includes("attendees") || table === attendees)
      return "attendees";
    if (tableStr.includes("users") || table === users) return "users";
    if (tableStr.includes("guestListRequests") || table === guestListRequests)
      return "guestListRequests";
    if (tableStr.includes("proactiveGuestList") || table === proactiveGuestList)
      return "proactiveGuestList";
    if (tableStr.includes("tickets")) return "tickets";
    if (tableStr.includes("checkInAudit")) return "checkInAudit";
    return "events"; // fallback
  }

  migrationClient = {} as unknown as ReturnType<typeof postgres>;
  db = {
    select: (_fields?: any) => {
      void _fields;
      return createMockSelectQuery();
    },
    insert: (table: any) => createMockInsertQuery(getTableName(table)),
    update: (table: any) => ({
      set: (data: any) => ({
        where: (_condition: any) => {
          void _condition;
          return {
          returning: () => {
            const tbl = getTableName(table);
            const updatedRecords = mockStorage[tbl].map((r: any) => {
              const updated: any = { ...r, ...data };
              // Auto-generate tokens and timestamps when appropriate
              if (
                tbl === "guestListRequests" &&
                data?.status === "approved" &&
                !updated.qrCodeToken
              ) {
                updated.qrCodeToken = randomUUID();
              }
              if (tbl === "proactiveGuestList" && data?.status === "archived") {
                updated.archivedAt = updated.archivedAt || new Date();
              }
              if (tbl === "tickets") {
                if (data?.status === "checked_in" && !updated.checkedInAt) {
                  updated.checkedInAt = new Date();
                }
                if (data?.status === "issued" && updated.checkedInAt) {
                  updated.checkedInAt = null;
                }
              }
              updated.updatedAt = new Date();
              return updated;
            });
            // Mutate storage
            mockStorage[tbl] = updatedRecords;
            return Promise.resolve(updatedRecords);
          },
          then: (resolve: (data: any) => void) => {
            const tbl = getTableName(table);
            const updatedRecords = mockStorage[tbl].map((r: any) => {
              const updated: any = { ...r, ...data };
              if (
                tbl === "guestListRequests" &&
                data?.status === "approved" &&
                !updated.qrCodeToken
              ) {
                updated.qrCodeToken = randomUUID();
              }
              if (tbl === "proactiveGuestList" && data?.status === "archived") {
                updated.archivedAt = updated.archivedAt || new Date();
              }
              if (tbl === "tickets") {
                if (data?.status === "checked_in" && !updated.checkedInAt) {
                  updated.checkedInAt = new Date();
                }
                if (data?.status === "issued" && updated.checkedInAt) {
                  updated.checkedInAt = null;
                }
              }
              updated.updatedAt = new Date();
              return updated;
            });
            mockStorage[tbl] = updatedRecords;
            resolve(updatedRecords);
          },
        };
        },
      }),
    }),
    delete: (table: any) => createMockDeleteQuery(getTableName(table)),
    query: {
      events: {
        findMany: async () => mockStorage.events,
        findFirst: async () => mockStorage.events[0] || undefined,
      },
      attendees: {
        findMany: async (_options?: any) => {
          void _options;
          return mockStorage.attendees;
        },
        findFirst: async (_options?: any) => {
          void _options;
          return mockStorage.attendees[0] || undefined;
        },
      },
      users: {
        findMany: async (_options?: any) => {
          void _options;
          return mockStorage.users;
        },
        findFirst: async (_options?: any) => {
          void _options;
          return mockStorage.users[0] || undefined;
        },
      },
      guestListRequests: {
        findMany: async (_options?: any) => {
          void _options;
          return mockStorage.guestListRequests;
        },
        findFirst: async (_options?: any) => {
          void _options;
          return mockStorage.guestListRequests[0] || undefined;
        },
      },
      proactiveGuestList: {
        findMany: async (_options?: any) => {
          void _options;
          return mockStorage.proactiveGuestList;
        },
        findFirst: async (_options?: any) => {
          void _options;
          return mockStorage.proactiveGuestList[0] || undefined;
        },
      },
      tickets: {
        findMany: async () => mockStorage.tickets,
        findFirst: async () => mockStorage.tickets[0] || undefined,
      },
      checkInAudit: {
        findMany: async () => mockStorage.checkInAudit,
        findFirst: async () => mockStorage.checkInAudit[0] || undefined,
      },
    },
  } as unknown as PostgresJsDatabase<typeof schema>;
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
    schema,
    logger: {
      logQuery: (query: string, params: unknown[]) => {
        console.log("Executing query:", query);
        console.log("With params:", params);
      },
    },
  });
}

export { migrationClient, db };
