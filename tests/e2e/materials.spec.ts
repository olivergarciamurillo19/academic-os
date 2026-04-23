import { expect, test } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const STORAGE = process.env.E2E_AUTH_STORAGE;
const HAS_STORAGE = Boolean(STORAGE && fs.existsSync(STORAGE));

test.use(HAS_STORAGE ? { storageState: STORAGE } : {});

test.describe("materials · upload", () => {
  test.skip(!HAS_STORAGE, "E2E_AUTH_STORAGE not set — skipping authenticated test");

  test("uploaded PDF appears in the list", async ({ page }) => {
    await page.goto("/subjects");

    // Open the first subject (if exists) or skip gracefully.
    const firstSubject = page.locator("a[href^='/subjects/']").first();
    if ((await firstSubject.count()) === 0) test.skip();

    await firstSubject.click();

    const fixture = path.resolve(__dirname, "fixtures/sample.pdf");
    if (!fs.existsSync(fixture)) test.skip();

    // File input can be hidden — locate via input[type=file].
    const input = page.locator("input[type='file']").first();
    await input.setInputFiles(fixture);

    // Wait for the file name to show up in the list.
    await expect(page.getByText(/sample\.pdf/i)).toBeVisible({ timeout: 30_000 });
  });
});
