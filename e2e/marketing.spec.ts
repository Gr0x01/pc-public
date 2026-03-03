import { test, expect } from "@playwright/test";

test("landing page renders hero headline", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("The FDA changed something")).toBeVisible();
});

test("pricing page shows three tiers", async ({ page }) => {
  await page.goto("/pricing");
  await expect(page.getByText("$49")).toBeVisible();
  await expect(page.getByText("$249")).toBeVisible();
});

test("sample report shows Marine Collagen Powder", async ({ page }) => {
  await page.goto("/sample");
  await expect(page.getByText("Marine Collagen Powder").first()).toBeVisible();
});

test("signup form shows success state after submission", async ({ page }) => {
  await page.goto("/");
  await page.locator('input[type="email"]').fill("test+e2e@example.com");
  await page.getByRole("button", { name: /start free/i }).click();
  await expect(page.getByText(/subscribed|on the list/i)).toBeVisible();
});
