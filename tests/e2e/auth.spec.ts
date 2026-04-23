import { expect, test } from "@playwright/test";

test.describe("auth · login page", () => {
  test("renders email + password form", async ({ page }) => {
    await page.goto("/login");
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByLabel(/correo/i).first()).toBeVisible();
    await expect(page.getByLabel(/contraseña/i).first()).toBeVisible();
    const buttons = page.getByRole("button");
    await expect(buttons.first()).toBeVisible();
  });

  test("unauthenticated user is redirected to /login from /dashboard", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);
  });
});
