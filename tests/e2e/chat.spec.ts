import { expect, test } from "@playwright/test";
import fs from "node:fs";

const STORAGE = process.env.E2E_AUTH_STORAGE;
const HAS_STORAGE = Boolean(STORAGE && fs.existsSync(STORAGE));

test.use(HAS_STORAGE ? { storageState: STORAGE } : {});

test.describe("chat · smoke", () => {
  test.skip(!HAS_STORAGE, "E2E_AUTH_STORAGE not set — skipping authenticated test");

  test("sends a message and receives a response", async ({ page }) => {
    await page.goto("/chat");

    const input = page.getByPlaceholder(/pregunta|mensaje|escribe/i).first();
    if ((await input.count()) === 0) test.skip();

    await input.fill("Hola, ¿estás despierto?");
    await input.press("Enter");

    // Wait for at least one assistant message bubble to appear.
    await expect(
      page.locator("[data-role='assistant'], [data-message-role='assistant']").first(),
    ).toBeVisible({ timeout: 45_000 });
  });
});
