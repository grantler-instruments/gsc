import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "@playwright/test";

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixtureDir = join(__dirname, "fixtures", "qlab5", "minimal");

test.describe("QLab 5 import", () => {
  test("imports synthetic workspace in browser", async ({ page }) => {
    await page.goto("/app/");
    await page.getByRole("button", { name: "GSC" }).click();
    await page.getByRole("menuitem", { name: /Import QLab 5/i }).click();
    await page.getByRole("button", { name: /Workspace file/i }).click();

    const workspacePath = join(fixtureDir, "GSC Import Fixture.qlab5");
    let workspaceBytes: Buffer;
    try {
      workspaceBytes = readFileSync(workspacePath);
    } catch {
      test.skip(true, "Binary .qlab5 fixture not generated on this platform");
      return;
    }

    await page.locator('input[type="file"]').last().setInputFiles({
      name: "GSC Import Fixture.qlab5",
      mimeType: "application/octet-stream",
      buffer: workspaceBytes,
    });

    await expect(page.getByRole("dialog", { name: /QLab import report/i })).toBeVisible({
      timeout: 15000,
    });
    await page.getByRole("button", { name: /Close/i }).click();
    await expect(page.getByText("GSC Import Fixture")).toBeVisible();
  });
});
