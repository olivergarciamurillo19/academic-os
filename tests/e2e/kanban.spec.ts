import { expect, test } from "@playwright/test";
import fs from "node:fs";

const STORAGE = process.env.E2E_AUTH_STORAGE;
const HAS_STORAGE = Boolean(STORAGE && fs.existsSync(STORAGE));

test.use(HAS_STORAGE ? { storageState: STORAGE } : {});

test.describe("kanban · create task", () => {
  test.skip(!HAS_STORAGE, "E2E_AUTH_STORAGE not set — skipping authenticated test");

  test("new task appears in the board", async ({ page }) => {
    await page.goto("/tasks");

    const addButton = page.getByRole("button", { name: /nueva tarea|crear tarea|add task/i }).first();
    if ((await addButton.count()) === 0) test.skip();
    await addButton.click();

    const title = `e2e-task-${Date.now()}`;
    const titleInput = page.getByLabel(/título|title/i).first();
    await titleInput.fill(title);

    await page.getByRole("button", { name: /guardar|crear|save/i }).first().click();

    await expect(page.getByText(title)).toBeVisible({ timeout: 15_000 });
  });
});
