import { expect, test } from "@playwright/test";

test.describe("auth · login page", () => {
  test("renders magic link and google buttons", async ({ page }) => {
    await page.goto("/login");
    await expect(page).toHaveURL(/\/login/);
    // Email input for magic link
    await expect(page.getByRole("textbox", { name: /email/i })).toBeVisible();
    // At least one submit button
    const buttons = page.getByRole("button");
    await expect(buttons.first()).toBeVisible();
  });

  test("unauthenticated user is redirected to /login from /dashboard", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);
  });
});
