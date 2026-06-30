import { expect, test } from "@playwright/test";
import { dropAudioOnHotCuePanel, WHITE_NOISE_ALT_NAME } from "./helpers/drop-audio";

test("dropping audio onto the hot cue panel creates a hot cue and asset", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("./");

  await expect(page.getByRole("button", { name: "GO" })).toBeVisible();
  await expect(page.getByRole("complementary", { name: "Hot cues" })).toBeVisible();

  const assetsPanel = page.locator('[data-gsc-drop-zone="assets"]');
  const mainCueList = page.locator('[data-gsc-drop-zone="cue-list"]');
  const hotCuePanel = page.getByRole("complementary", { name: "Hot cues" });

  await expect(assetsPanel.getByText("No assets yet")).toBeVisible();
  await expect(mainCueList.getByText(WHITE_NOISE_ALT_NAME)).toHaveCount(0);
  await expect(
    hotCuePanel.getByText("Drop assets here or use the flame button to add hot cues."),
  ).toBeVisible();

  await dropAudioOnHotCuePanel(page);

  await expect(hotCuePanel.getByText(WHITE_NOISE_ALT_NAME, { exact: true })).toBeVisible();
  await expect(hotCuePanel.getByRole("button", { name: "GO" })).toBeVisible();
  await expect(mainCueList.getByText(WHITE_NOISE_ALT_NAME)).toHaveCount(0);
  await expect(assetsPanel.getByText(WHITE_NOISE_ALT_NAME, { exact: true })).toBeVisible();
});
