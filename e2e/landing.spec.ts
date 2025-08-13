import { test, expect } from "@playwright/test";

test("landing hero shows single CTA and navigates to discovery", async ({
  page,
}) => {
  await page.goto("/");

  const cta = page.getByRole("link", { name: /discover events/i });
  await expect(cta).toBeVisible();

  // Ensure only one CTA in hero: check the first section for one link matching
  const hero = page.locator("section").first();
  await expect(
    hero.getByRole("link", { name: /discover events/i })
  ).toHaveCount(1);

  await cta.click();
  await expect(page.locator("main#discover")).toBeVisible();
});
