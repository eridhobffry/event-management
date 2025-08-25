import "@testing-library/jest-dom";
import { config as loadEnv } from "dotenv";

// Load environment variables for tests
// Load .env.local first (if present), then fallback to .env without overriding existing vars
loadEnv({ path: ".env.local", override: false });
loadEnv({ path: ".env", override: false });

// Unset database URL for tests to force mock database usage
delete process.env.NEON_DATABASE_URL;

// Set NODE_ENV for tests using defineProperty to avoid read-only error
Object.defineProperty(process.env, "NODE_ENV", {
  value: "test",
  writable: true,
  configurable: true,
});
