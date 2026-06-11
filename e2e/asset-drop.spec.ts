import { expect, test } from "@playwright/test";
import { sequenceCueListPanel } from "./helpers/cue-list-panel";
import { dropAudioOnCueList, WHITE_NOISE_NAME } from "./helpers/drop-audio";

test("dropping audio onto the cue list creates an audio cue and asset", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("./");

  await expect(page.getByRole("button", { name: "GO" })).toBeVisible();

  const assetsPanel = page.locator('[data-gsc-drop-zone="assets"]');
  await expect(assetsPanel.getByText("No assets yet")).toBeVisible();

  await dropAudioOnCueList(page);

  const mainCueList = sequenceCueListPanel(page).locator('[data-gsc-drop-zone="cue-list"]');
  const cue = mainCueList.locator("[data-cue-id]").filter({ hasText: WHITE_NOISE_NAME });
  await expect(cue).toBeVisible();
  await expect(cue).toHaveCount(1);

  await expect(assetsPanel.getByText(WHITE_NOISE_NAME, { exact: true })).toBeVisible();
  await expect(assetsPanel.getByText("No assets yet")).toHaveCount(0);
});
