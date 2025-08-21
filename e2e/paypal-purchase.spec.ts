import { test, expect } from "@playwright/test";
import type { Page, Frame } from "@playwright/test";

// This E2E validates the PayPal purchase flow end-to-end.
// In CI: Uses mocked PayPal endpoints for reliability
// Locally: Uses real PayPal sandbox for full integration testing
//
// Real PayPal flow requires:
// - Server env: PAYPAL_CLIENT_ID, PAYPAL_SECRET, PAYPAL_ENV=sandbox
// - Buyer creds: PAYPAL_SANDBOX_BUYER_EMAIL, PAYPAL_SANDBOX_BUYER_PASSWORD
// - A real database with ticketing tables: NEON_DATABASE_URL
// - A purchasable event. Provide E2E_EVENT_ID via env (recommended).
//   If not provided, we will resolve an event id via the UI from /events
//   (defaulting to the seeded "React Conference 2025").
//
// CI mode: Only requires basic database setup and will mock PayPal interactions

const HAS_SERVER_ENVS =
  !!process.env.PAYPAL_CLIENT_ID &&
  !!process.env.PAYPAL_SECRET &&
  !!process.env.PAYPAL_ENV;
const HAS_BUYER_ENVS =
  !!process.env.PAYPAL_SANDBOX_BUYER_EMAIL &&
  !!process.env.PAYPAL_SANDBOX_BUYER_PASSWORD;
const HAS_DB = !!process.env.NEON_DATABASE_URL;

const IS_CI = process.env.CI === "true" || process.env.CI === "1";
const USE_PAYPAL_MOCKS = IS_CI || process.env.PAYPAL_E2E_MODE === "mock";

// For real PayPal flow: require all credentials
// For CI/mock mode: only require database
const SHOULD_RUN = USE_PAYPAL_MOCKS
  ? HAS_DB
  : HAS_SERVER_ENVS &&
    HAS_BUYER_ENVS &&
    HAS_DB &&
    process.env.PAYPAL_ENV?.toLowerCase() === "sandbox";

// Optional explicit event id/name for CI stability
const EVENT_ID = process.env.E2E_EVENT_ID;
const PREFERRED_EVENT_NAME =
  process.env.E2E_EVENT_NAME || "React Conference 2025";

type CreateOrderResult = {
  orderId: string;
  paypalOrderId: string;
  approvalUrl?: string;
};

type CaptureResult = {
  ok?: boolean;
  received?: boolean;
  error?: string;
  orderId?: string;
  eventId?: string;
};

// Mock response helpers for CI
function createMockOrderResponse(eventId: string): CreateOrderResult {
  const mockOrderId = `mock-order-${eventId}-${Date.now()}`;
  const mockPayPalOrderId = `MOCK-PAYPAL-${eventId}-${Date.now()}`;
  return {
    orderId: mockOrderId,
    paypalOrderId: mockPayPalOrderId,
    approvalUrl: `https://sandbox.paypal.com/checkoutnow?token=${mockPayPalOrderId}`,
  };
}

function createMockCaptureResponse(
  orderId: string,
  eventId: string
): CaptureResult {
  return {
    ok: true,
    received: true,
    orderId,
    eventId,
  };
}

// Setup PayPal mocking for CI
async function setupPayPalMocks(page: Page, eventId: string) {
  if (!USE_PAYPAL_MOCKS) return;

  // Mock create-order endpoint
  await page.route("**/api/paypal/create-order", async (route) => {
    const mockResponse = createMockOrderResponse(eventId);
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(mockResponse),
    });
  });

  // Mock capture endpoint
  await page.route("**/api/paypal/capture", async (route) => {
    const request = route.request();
    let orderId = "mock-order-captured";

    try {
      const postData = await request.postData();
      if (postData) {
        const body = JSON.parse(postData);
        orderId = body.orderId || orderId;
      }
    } catch {}

    const mockResponse = createMockCaptureResponse(orderId, eventId);
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(mockResponse),
    });
  });
}

// Resolve an event id either from env or by discovering it via the UI
async function resolveEventId(page: Page): Promise<string> {
  if (EVENT_ID) return EVENT_ID;

  // Discover from /events page by finding the preferred event card and extracting the /register href
  await page.goto("/events");
  // Wait for the listing and the preferred event name to render
  await page.waitForLoadState("domcontentloaded");
  await page
    .getByText(PREFERRED_EVENT_NAME, { exact: false })
    .first()
    .waitFor({ timeout: 15000 });

  const card = page.locator("div", { hasText: PREFERRED_EVENT_NAME }).first();
  const registerLink = card
    .getByRole("link", { name: /Register Now/i })
    .first();

  // Try to parse the id from the href directly
  const href = (await registerLink.getAttribute("href")) || "";
  let match = href.match(/\/events\/([^/]+)\//);
  if (!match) {
    // Navigate into register page and read from URL as fallback
    await Promise.all([
      page.waitForURL(/\/events\/.+\/register/),
      registerLink.click(),
    ]);
    const regUrl = page.url();
    match = regUrl.match(/\/events\/([^/]+)\/register/);
  }

  const id = match?.[1];
  if (!id) throw new Error("Unable to resolve event id from /events UI");
  return id;
}

// Heuristic helper to interact with PayPal sandbox pages (selectors can change).
async function approveInPayPal(ctx: Page | Frame) {
  // Sometimes cookie consent appears.
  try {
    const accept = ctx.locator('button:has-text("Accept")');
    if (await accept.isVisible({ timeout: 2000 }).catch(() => false)) {
      await accept.click();
    }
  } catch {}

  // Login step
  const email = process.env.PAYPAL_SANDBOX_BUYER_EMAIL!;
  const password = process.env.PAYPAL_SANDBOX_BUYER_PASSWORD!;

  // Email field variants
  const emailSelectors = [
    'input[name="login_email"]',
    "#email",
    'input[name="email"]',
    "input#email",
  ];
  for (const sel of emailSelectors) {
    const el = ctx.locator(sel);
    if (
      await el
        .first()
        .isVisible({ timeout: 3000 })
        .catch(() => false)
    ) {
      await el.first().fill(email);
      break;
    }
  }

  // Next/Continue after email
  const nextButtons = [
    'button:has-text("Next")',
    'button:has-text("Continue")',
  ];
  for (const sel of nextButtons) {
    const btn = ctx.locator(sel);
    if (
      await btn
        .first()
        .isVisible({ timeout: 2000 })
        .catch(() => false)
    ) {
      await btn.first().click();
      break;
    }
  }

  // Password field variants
  const passSelectors = [
    'input[name="login_password"]',
    "#password",
    'input[name="password"]',
    "input#password",
  ];
  for (const sel of passSelectors) {
    const el = ctx.locator(sel);
    if (
      await el
        .first()
        .isVisible({ timeout: 3000 })
        .catch(() => false)
    ) {
      await el.first().fill(password);
      break;
    }
  }

  // Log in
  const loginButtons = [
    'button:has-text("Log In")',
    'button:has-text("Log in")',
    'button:has-text("Login")',
  ];
  for (const sel of loginButtons) {
    const btn = ctx.locator(sel);
    if (
      await btn
        .first()
        .isVisible({ timeout: 2000 })
        .catch(() => false)
    ) {
      await btn.first().click();
      break;
    }
  }

  // Approve/Pay now
  const approveButtons = [
    'button:has-text("Pay Now")',
    'button:has-text("Agree & Pay")',
    'button:has-text("Continue")',
    'button:has-text("Complete Purchase")',
  ];
  for (const sel of approveButtons) {
    const btn = ctx.locator(sel);
    if (
      await btn
        .first()
        .isVisible({ timeout: 5000 })
        .catch(() => false)
    ) {
      await btn.first().click();
      break;
    }
  }
}

// Skip the entire suite if we don't have what we need.
// This ensures CI will not fail when credentials are not configured.
test.describe("PayPal Purchase Flow", () => {
  test.beforeEach(({}, testInfo) => {
    if (!SHOULD_RUN) {
      const reason = USE_PAYPAL_MOCKS
        ? "Skipping PayPal flow: missing database URL"
        : "Skipping PayPal flow: missing PAYPAL_* envs, buyer creds, or database URL";
      testInfo.skip(true, reason);
    }
  });

  // Longer timeout for real PayPal flow, shorter for mocked
  test.setTimeout(USE_PAYPAL_MOCKS ? 60_000 : 180_000);

  test("completes a paid purchase via PayPal and reaches success page", async ({
    page,
    context,
  }) => {
    // Resolve a valid event id (env or via UI) and navigate to its purchase page
    const resolvedId = await resolveEventId(page);

    // Setup mocks if in CI mode
    await setupPayPalMocks(page, resolvedId);

    await page.goto(`/events/${resolvedId}/purchase`);

    // Fill email
    const email = `paypal-e2e+${Date.now()}@example.com`;
    const emailInput = page.getByPlaceholder(/you@example\.com/i).first();
    await expect(emailInput).toBeVisible();
    await emailInput.fill(email);

    // Select 1 ticket (first quantity input)
    const qty = page.getByRole("spinbutton").first();
    await expect(qty).toBeVisible();
    await qty.fill("1");

    if (USE_PAYPAL_MOCKS) {
      // ========== MOCKED FLOW FOR CI ==========
      console.log("Running PayPal E2E test in mocked mode for CI");

      // Capture the create-order request
      const createOrderResPromise = page
        .waitForResponse(
          (res) =>
            res.url().includes("/api/paypal/create-order") &&
            res.request().method() === "POST"
        )
        .catch(() => null);

      await page.getByRole("button", { name: /Pay with PayPal/i }).click();

      const createOrderRes = await createOrderResPromise;
      let createdPayPal: CreateOrderResult | null = null;
      if (createOrderRes) {
        try {
          createdPayPal = (await createOrderRes.json()) as CreateOrderResult;
        } catch {}
      }

      // In mock mode, simulate successful PayPal approval by calling capture directly
      if (createdPayPal?.paypalOrderId) {
        const capRes = await page.request.post("/api/paypal/capture", {
          data: { paypalOrderId: createdPayPal.paypalOrderId },
        });

        if (!capRes.ok()) {
          throw new Error(`Mock capture failed: status=${capRes.status()}`);
        }

        // Navigate to return URL to simulate PayPal redirect back
        await page.goto(`/paypal/return?token=${createdPayPal.paypalOrderId}`);
      } else {
        throw new Error(
          "Mock create-order did not return expected PayPal order ID"
        );
      }
    } else {
      // ========== REAL PAYPAL FLOW FOR LOCAL DEVELOPMENT ==========
      console.log("Running PayPal E2E test with real PayPal sandbox");

      // Enhanced popup/iframe handling for better reliability
      const [popup] = await Promise.all([
        context.waitForEvent("page", { timeout: 20_000 }).catch(() => null),
        page.getByRole("button", { name: /Pay with PayPal/i }).click(),
      ]);

      if (popup) {
        // Handle popup window
        await popup.waitForLoadState("domcontentloaded");
        await approveInPayPal(popup);
        await popup.waitForEvent("close", { timeout: 60_000 });
      } else {
        // Handle iframe or in-page redirect
        const iframeLocator = page.locator(
          'iframe[src*="paypal.com"], iframe[src*="paypalobjects.com"], iframe[name*="paypal"]'
        );
        const frameHandle = await iframeLocator
          .first()
          .elementHandle({ timeout: 15_000 })
          .catch(() => null);

        if (frameHandle) {
          const frame = (await frameHandle.contentFrame()) as Frame | null;
          if (!frame)
            throw new Error("PayPal iframe detected but frame was null");
          await approveInPayPal(frame);
        } else {
          // Check for in-page navigation to PayPal
          const isOnPayPal = await page
            .waitForURL(/paypal\.com|paypalobjects\.com|sandbox\.paypal\.com/, {
              timeout: 20_000,
            })
            .then(() => true)
            .catch(() => false);

          if (isOnPayPal) {
            await page.waitForLoadState("domcontentloaded");
            await approveInPayPal(page);
          } else {
            throw new Error(
              "Unable to detect PayPal context (popup, iframe, or redirect)"
            );
          }
        }
      }

      // Wait for return to our app
      await page.waitForURL(/\/paypal\/return/, { timeout: 60_000 });
    }

    // Final success page validation (same for both flows)
    await page.waitForURL(/\/events\/[^/]+\/purchase\/success/, {
      timeout: 30_000,
    });

    // Assert success UI
    await expect(page.getByText(/Payment complete/i)).toBeVisible();
    await expect(
      page.getByText(/Your payment has been submitted\./i)
    ).toBeVisible();

    console.log(
      `PayPal E2E test completed successfully in ${
        USE_PAYPAL_MOCKS ? "mocked" : "real"
      } mode`
    );
  });
});
