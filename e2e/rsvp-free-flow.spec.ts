import { test, expect } from "@playwright/test";

test.describe("Free RSVP 2-step flow", () => {
  test("progress, inline errors, sticky summary, trust cues, success with QR + invite", async ({
    page,
  }) => {
    // Navigate to register page via listing CTA
    await page.goto("/events");
    const registerLink = page.getByRole("link", { name: /RSVP Free/i }).first();
    await expect(registerLink).toBeVisible();
    await Promise.all([
      page.waitForURL(/\/events\/[^/]+\/register/),
      registerLink.click(),
    ]);

    // Progress indicator labels
    const progress = page.getByLabel("Progress");
    await expect(progress.getByText(/^Details$/)).toBeVisible();
    await expect(progress.getByText(/^Confirm$/)).toBeVisible();

    // Step 1: try continue without filling -> aria-invalid on fields
    await page.getByRole("button", { name: /Continue/i }).click();
    await expect(page.getByLabel(/First Name/i)).toHaveAttribute(
      "aria-invalid",
      "true"
    );
    await expect(page.getByLabel(/Last Name/i)).toHaveAttribute(
      "aria-invalid",
      "true"
    );
    await expect(page.getByLabel(/Email Address/i)).toHaveAttribute(
      "aria-invalid",
      "true"
    );

    // Fill valid fields
    await page.getByLabel(/First Name/i).fill("Test");
    await page.getByLabel(/Last Name/i).fill("User");
    await page
      .getByLabel(/Email Address/i)
      .fill(`playwright-${Date.now()}@example.com`);

    // Continue to Confirm
    await page.getByRole("button", { name: /Continue/i }).click();

    // Sticky order summary with trust cues
    const orderSummary = page.getByText(/Order Summary/i).first();
    await expect(orderSummary).toBeVisible();
    await expect(page.getByText(/Free/i).first()).toBeVisible();
    await expect(page.getByText(/Secure/i).first()).toBeVisible();

    // Confirm & Register
    const confirmBtn = page.getByRole("button", {
      name: /Confirm & Register|Registering/i,
    });
    await Promise.all([
      page.waitForURL(/\/events\/[^/]+\/register\/thanks/),
      confirmBtn.click(),
    ]);

    // Success page
    await expect(page).toHaveURL(/\/events\/[^/]+\/register\/thanks/);
    await expect(page.getByText(/You.*re all set!/i)).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Invite friends/i })
    ).toBeVisible();

    // QR canvas present
    const canvas = page.locator("canvas");
    await expect(canvas).toBeVisible();
  });

  test("Confirm & Register appears only after Continue (step gating)", async ({
    page,
  }) => {
    await page.goto("/events");
    const registerLink = page.getByRole("link", { name: /RSVP Free/i }).first();
    await Promise.all([
      page.waitForURL(/\/events\/[^/]+\/register/),
      registerLink.click(),
    ]);

    await expect(
      page.getByRole("button", { name: /Confirm & Register/i })
    ).toHaveCount(0);
    await page.getByLabel(/First Name/i).fill("Step");
    await page.getByLabel(/Last Name/i).fill("Gate");
    await page
      .getByLabel(/Email Address/i)
      .fill(`gate-${Date.now()}@example.com`);
    await page.getByRole("button", { name: /Continue/i }).click();
    await expect(
      page.getByRole("button", { name: /Confirm & Register/i })
    ).toBeVisible();
  });
});
