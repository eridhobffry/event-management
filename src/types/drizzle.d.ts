import "drizzle-kit";

declare module "drizzle-kit" {
  interface Config {
    schema?: string;
    out?: string;
    driver?: "pg" | "mysql" | "better-sqlite" | "libsql" | "turso";
    dbCredentials?: {
      connectionString?: string;
    };
    connectionString?: string;
    verbose?: boolean;
    strict?: boolean;
  }
}
