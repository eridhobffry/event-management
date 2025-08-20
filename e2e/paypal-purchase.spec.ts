import { test, expect } from "@playwright/test";

// This E2E validates the full PayPal sandbox purchase flow end-to-end.
// It requires:
// - Server env: PAYPAL_CLIENT_ID, PAYPAL_SECRET, PAYPAL_ENV=sandbox
// - Buyer creds: PAYPAL_SANDBOX_BUYER_EMAIL, PAYPAL_SANDBOX_BUYER_PASSWORD
// - A real database with ticketing tables: NEON_DATABASE_URL
// - A purchasable event. Provide E2E_EVENT_ID via env (recommended).
//   If not provided, we will resolve an event id via the UI from /events
//   (defaulting to the seeded "React Conference 2025").
//
// The test is skipped automatically when any required env is missing.

const HAS_SERVER_ENVS = !!process.env.PAYPAL_CLIENT_ID && !!process.env.PAYPAL_SECRET && !!process.env.PAYPAL_ENV;
const HAS_BUYER_ENVS = !!process.env.PAYPAL_SANDBOX_BUYER_EMAIL && !!process.env.PAYPAL_SANDBOX_BUYER_PASSWORD;
const HAS_DB = !!process.env.NEON_DATABASE_URL;

const SHOULD_RUN = HAS_SERVER_ENVS && HAS_BUYER_ENVS && HAS_DB && (process.env.PAYPAL_ENV?.toLowerCase() === "sandbox");

// Optional explicit event id/name for CI stability
const EVENT_ID = process.env.E2E_EVENT_ID;
const PREFERRED_EVENT_NAME = process.env.E2E_EVENT_NAME || "React Conference 2025";

// Resolve an event id either from env or by discovering it via the UI
async function resolveEventId(page: import("@playwright/test").Page): Promise<string> {
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
  const registerLink = card.getByRole("link", { name: /Register Now/i }).first();

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
async function approveInPayPal(page: import("@playwright/test").Page) {
  // Sometimes cookie consent appears.
  try {
    const accept = page.locator('button:has-text("Accept")');
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
    '#email',
    'input[name="email"]',
    'input#email',
  ];
  for (const sel of emailSelectors) {
    const el = page.locator(sel);
    if (await el.first().isVisible({ timeout: 3000 }).catch(() => false)) {
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
    const btn = page.locator(sel);
    if (await btn.first().isVisible({ timeout: 2000 }).catch(() => false)) {
      await btn.first().click();
      break;
    }
  }

  // Password field variants
  const passSelectors = [
    'input[name="login_password"]',
    '#password',
    'input[name="password"]',
    'input#password',
  ];
  for (const sel of passSelectors) {
    const el = page.locator(sel);
    if (await el.first().isVisible({ timeout: 3000 }).catch(() => false)) {
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
    const btn = page.locator(sel);
    if (await btn.first().isVisible({ timeout: 2000 }).catch(() => false)) {
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
    const btn = page.locator(sel);
    if (await btn.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await btn.first().click();
      break;
    }
  }
}

// Skip the entire suite if we don't have what we need.
// This ensures CI will not fail when credentials are not configured.
test.describe("PayPal Sandbox Purchase", () => {
  test.beforeEach(({}, testInfo) => {
    if (!SHOULD_RUN) {
      testInfo.skip(true, "Skipping PayPal flow: missing PAYPAL_* envs, buyer creds, or database URL");
    }
  });

  test.setTimeout(180_000);

  test("completes a paid purchase via PayPal and reaches success page", async ({ page }) => {
    // Resolve a valid event id (env or via UI) and navigate to its purchase page
    const resolvedId = await resolveEventId(page);
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

    // Click Pay with PayPal and follow redirect to PayPal
    await Promise.all([
      page.waitForNavigation({ url: /paypal\.com|paypalobjects\.com|sandbox\.paypal\.com/, timeout: 60_000 }),
      page.getByRole("button", { name: /Pay with PayPal/i }).click(),
    ]);

    // Approve in PayPal sandbox
    await page.waitForLoadState("domcontentloaded");
    await approveInPayPal(page);

    // Wait to be redirected back to our app's return URL, then to success
    await page.waitForURL(/\/paypal\/return/, { timeout: 60_000 });
    await page.waitForURL(/\/events\/[^/]+\/purchase\/success/, { timeout: 60_000 });

    // Assert success UI
    await expect(page.getByText(/Payment complete/i)).toBeVisible();
    await expect(page.getByText(/Your payment has been submitted\./i)).toBeVisible();
  });
});
