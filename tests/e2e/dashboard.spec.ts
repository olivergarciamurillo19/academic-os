import { expect, test } from "@playwright/test";
import fs from "node:fs";

const STORAGE = process.env.E2E_AUTH_STORAGE;
const HAS_STORAGE = Boolean(STORAGE && fs.existsSync(STORAGE));

test.use(HAS_STORAGE ? { storageState: STORAGE } : {});

test.describe("dashboard · golden path", () => {
  test.skip(!HAS_STORAGE, "E2E_AUTH_STORAGE not set — skipping authenticated test");

  test("renders main sections after login", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/dashboard/);

    // Heading or landmark — don't pin to exact copy, just assert presence.
    await expect(page.locator("main, [role='main']").first()).toBeVisible();
  });
});
