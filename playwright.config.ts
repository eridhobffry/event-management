import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
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
    command: "PORT=3050 NEXT_PUBLIC_APP_URL=http://localhost:3050 npm run dev",
    url: "http://localhost:3050",
    reuseExistingServer: false,
    stdout: "pipe",
    stderr: "pipe",
    timeout: 180000,
  },
});
