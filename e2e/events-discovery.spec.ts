import { test, expect } from "@playwright/test";

test("discovery filters by category and shows empty state with clear buttons", async ({
  page,
}) => {
  await page.goto("/events");

  // Ensure filters visible (scope to the filters toolbar)
  await expect(page.getByText(/Filters/i).first()).toBeVisible();

  // Open category select and choose Workshop (seed includes Digital Marketing Workshop)
  const categoryCombobox = page
    .getByRole("combobox", { name: "Filter by category" })
    .or(page.getByRole("button", { name: "Filter by category" }));
  await categoryCombobox.click();
  await page.getByRole("option", { name: "Workshop" }).click();

  // Expect at least one card containing Workshop event name
  await expect(page.getByText(/Digital Marketing Workshop/i)).toBeVisible();

  // Combine with a query that yields no results to trigger empty state
  await page.getByLabel(/Search events/i).fill("zzzzzzzz-no-match");
  await expect(page.getByText(/No results/i)).toBeVisible();
  await expect(page.getByRole("button", { name: /Clear city/i })).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Clear category/i })
  ).toBeVisible();
  await expect(page.getByRole("button", { name: /Clear date/i })).toBeVisible();

  // Clear category and query to return to results
  await page.getByRole("button", { name: /Clear category/i }).click();
  await page.getByLabel(/Search events/i).fill("");
  await expect(page.getByText(/React Conference 2025/i)).toBeVisible();

  // Reset all button clears filters and query
  const resetAll = page.getByRole("button", { name: /Reset all/i });
  await expect(resetAll).toBeVisible();
  await resetAll.click();
  await expect(page).toHaveURL(/\/events(\?|$)/);
  // Should show multiple events after reset
  await expect(page.getByText(/React Conference 2025/i)).toBeVisible();
});
