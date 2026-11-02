import { expect, test } from "@playwright/test";

test("signed-out visitors land on sign-in, with security headers", async ({ page }) => {
  const res = await page.goto("/recipes");
  await expect(page).toHaveURL(/\/login\?next=%2Frecipes/);
  await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
  expect(res?.headers()["x-frame-options"]).toBe("DENY");
});

test("no horizontal scroll at phone width", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 780 });
  for (const path of ["/login", "/signup", "/offline"]) {
    await page.goto(path);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  }
});

test("health endpoint answers", async ({ request }) => {
  const res = await request.get("/api/health");
  expect(res.ok()).toBe(true);
});
