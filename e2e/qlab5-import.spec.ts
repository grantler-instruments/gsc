import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "@playwright/test";
import { gotoApp, pressModShortcut } from "./helpers/app";

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixtureDir = join(__dirname, "fixtures", "qlab5", "minimal");

test.describe("QLab 5 import", () => {
  test("imports synthetic workspace in browser", async ({ page }) => {
    await gotoApp(page, { resetStorage: true });

    const workspacePath = join(fixtureDir, "GSC Import Fixture.qlab5");
    let workspaceBytes: Buffer;
    try {
      workspaceBytes = readFileSync(workspacePath);
    } catch {
      test.skip(true, "Binary .qlab5 fixture not generated on this platform");
      return;
    }

    await pressModShortcut(page, "o");
    const openDialog = page.getByRole("dialog", { name: /^Open/ });
    await expect(openDialog).toBeVisible();

    const fileChooserPromise = page.waitForEvent("filechooser");
    await openDialog.getByRole("button", { name: /^Open file/ }).click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles({
      name: "GSC Import Fixture.qlab5",
      mimeType: "application/octet-stream",
      buffer: workspaceBytes,
    });

    const confirmDialog = page.getByRole("dialog", { name: /Import QLab project/i });
    await expect(confirmDialog).toBeVisible();
    await confirmDialog.getByRole("button", { name: /^Import$/ }).click();

    await expect(page.getByRole("dialog", { name: /QLab import report/i })).toBeVisible({
      timeout: 15_000,
    });
    await page.getByRole("button", { name: /Close/i }).click();
    await expect(page.getByText("GSC Import Fixture")).toBeVisible();
  });
});
