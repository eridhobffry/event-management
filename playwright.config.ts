import "dotenv/config";
import { config as loadEnv } from "dotenv";
import { defineConfig, devices } from "@playwright/test";

// Load .env.local for Playwright workers so E2E specs see required envs without shell-exporting.
// Keep .env as default via dotenv/config; do not override existing values.
loadEnv({ path: ".env.local", override: false });

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  timeout: 60000, // 60 seconds timeout for tests that include email sending
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3050",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "iphone-12",
      use: { ...devices["iPhone 12"] },
    },
  ],
  webServer: {
    command: `${(() => {
      const isCI = process.env.CI === "true" || process.env.CI === "1";
      const useMocks = isCI || process.env.PAYPAL_E2E_MODE === "mock";
      const mockFlag = useMocks ? "NEXT_PUBLIC_PAYPAL_E2E_MODE=mock " : "";
      return `${mockFlag}PORT=3050 NEXT_PUBLIC_APP_URL=http://localhost:3050 npm run dev`;
    })()}`,
    url: "http://localhost:3050",
    reuseExistingServer: false,
    stdout: "pipe",
    stderr: "pipe",
    timeout: 180000,
  },
});
