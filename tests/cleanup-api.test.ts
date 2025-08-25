import { expect, test, describe, beforeAll, afterAll } from "vitest";
import { spawn } from "child_process";

describe("Cleanup API Endpoint", () => {
  let serverProcess: any;
  const TEST_SECRET = "test-secret-123";
  const BASE_URL = "http://localhost:3001"; // Use different port for testing

  beforeAll(async () => {
    // Start the Next.js server for testing
    serverProcess = spawn("npm", ["run", "dev"], {
      stdio: "pipe",
      env: {
        ...process.env,
        PORT: "3001",
        CRON_SECRET: TEST_SECRET,
        NODE_ENV: "test",
      },
    });

    // Wait for server to start
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("Server failed to start within 30 seconds"));
      }, 30000);

      serverProcess.stdout?.on("data", (data: Buffer) => {
        const output = data.toString();
        if (output.includes("Ready in")) {
          clearTimeout(timeout);
          // Wait a bit more for the server to be fully ready
          setTimeout(resolve, 2000);
        }
      });

      serverProcess.stderr?.on("data", (data: Buffer) => {
        console.error("Server error:", data.toString());
      });
    });
  }, 35000);

  afterAll(async () => {
    // Clean up server process
    if (serverProcess) {
      serverProcess.kill("SIGTERM");

      // Wait for process to exit
      await new Promise((resolve) => {
        serverProcess.on("exit", resolve);
        setTimeout(resolve, 5000); // Force exit after 5 seconds
      });
    }
  });

  describe("Authentication", () => {
    test("should return 401 when no x-cron-secret header is provided", async () => {
      const response = await fetch(
        `${BASE_URL}/api/admin/release-stale-reservations?ttlMinutes=30`
      );
      expect(response.status).toBe(401);
      const text = await response.text();
      expect(text).toBe("Unauthorized");
    });

    test("should return 401 when wrong secret is provided", async () => {
      const response = await fetch(
        `${BASE_URL}/api/admin/release-stale-reservations?ttlMinutes=30`,
        {
          headers: {
            "x-cron-secret": "wrong-secret",
          },
        }
      );
      expect(response.status).toBe(401);
      const text = await response.text();
      expect(text).toBe("Unauthorized");
    });

    test("should return 401 when empty secret is provided", async () => {
      const response = await fetch(
        `${BASE_URL}/api/admin/release-stale-reservations?ttlMinutes=30`,
        {
          headers: {
            "x-cron-secret": "",
          },
        }
      );
      expect(response.status).toBe(401);
      const text = await response.text();
      expect(text).toBe("Unauthorized");
    });
  });

  describe("Parameter Validation", () => {
    test("should return 400 when ttlMinutes is invalid", async () => {
      const response = await fetch(
        `${BASE_URL}/api/admin/release-stale-reservations?ttlMinutes=invalid`,
        {
          headers: {
            "x-cron-secret": TEST_SECRET,
          },
        }
      );
      expect(response.status).toBe(400);
      const text = await response.text();
      expect(text).toBe("Invalid ttlMinutes parameter");
    });

    test("should return 400 when ttlMinutes is negative", async () => {
      const response = await fetch(
        `${BASE_URL}/api/admin/release-stale-reservations?ttlMinutes=-5`,
        {
          headers: {
            "x-cron-secret": TEST_SECRET,
          },
        }
      );
      expect(response.status).toBe(400);
      const text = await response.text();
      expect(text).toBe("Invalid ttlMinutes parameter");
    });

    test("should return 400 when ttlMinutes is zero", async () => {
      const response = await fetch(
        `${BASE_URL}/api/admin/release-stale-reservations?ttlMinutes=0`,
        {
          headers: {
            "x-cron-secret": TEST_SECRET,
          },
        }
      );
      expect(response.status).toBe(400);
      const text = await response.text();
      expect(text).toBe("Invalid ttlMinutes parameter");
    });
  });

  describe("Successful Requests", () => {
    test("should return 200 with correct response when valid ttlMinutes is provided", async () => {
      const ttlMinutes = 45;
      const response = await fetch(
        `${BASE_URL}/api/admin/release-stale-reservations?ttlMinutes=${ttlMinutes}`,
        {
          headers: {
            "x-cron-secret": TEST_SECRET,
          },
        }
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toEqual({
        ok: true,
        ttlMinutes: ttlMinutes,
        message: `Cleanup completed successfully for reservations older than ${ttlMinutes} minutes`,
      });
    });

    test("should return 200 with default ttlMinutes (30) when no ttlMinutes parameter is provided", async () => {
      const response = await fetch(
        `${BASE_URL}/api/admin/release-stale-reservations`,
        {
          headers: {
            "x-cron-secret": TEST_SECRET,
          },
        }
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toEqual({
        ok: true,
        ttlMinutes: 30,
        message:
          "Cleanup completed successfully for reservations older than 30 minutes",
      });
    });

    test("should handle large ttlMinutes values", async () => {
      const ttlMinutes = 1440; // 24 hours
      const response = await fetch(
        `${BASE_URL}/api/admin/release-stale-reservations?ttlMinutes=${ttlMinutes}`,
        {
          headers: {
            "x-cron-secret": TEST_SECRET,
          },
        }
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toEqual({
        ok: true,
        ttlMinutes: ttlMinutes,
        message: `Cleanup completed successfully for reservations older than ${ttlMinutes} minutes`,
      });
    });
  });

  describe("HTTP Methods", () => {
    test("should only accept GET method", async () => {
      const methods = ["POST", "PUT", "DELETE", "PATCH"];

      for (const method of methods) {
        const response = await fetch(
          `${BASE_URL}/api/admin/release-stale-reservations?ttlMinutes=30`,
          {
            method,
            headers: {
              "x-cron-secret": TEST_SECRET,
            },
          }
        );

        // Next.js should return 405 Method Not Allowed for unsupported methods
        expect([404, 405]).toContain(response.status);
      }
    });
  });

  describe("Edge Cases", () => {
    test("should handle very large ttlMinutes values", async () => {
      const ttlMinutes = 999999;
      const response = await fetch(
        `${BASE_URL}/api/admin/release-stale-reservations?ttlMinutes=${ttlMinutes}`,
        {
          headers: {
            "x-cron-secret": TEST_SECRET,
          },
        }
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.ttlMinutes).toBe(ttlMinutes);
    });

    test("should handle decimal ttlMinutes by truncating", async () => {
      const response = await fetch(
        `${BASE_URL}/api/admin/release-stale-reservations?ttlMinutes=30.7`,
        {
          headers: {
            "x-cron-secret": TEST_SECRET,
          },
        }
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.ttlMinutes).toBe(30); // Should be truncated to integer
    });
  });
});
