import { expect, test } from "@playwright/test";
import { transportGoButton } from "./helpers/active-cues";
import { dropAudioOnHotCuePanel, WHITE_NOISE_ALT_NAME } from "./helpers/drop-audio";
import { hotCuePanel } from "./helpers/hot-cues";

test("dropping audio onto the hot cue panel creates a hot cue and asset", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("./");

  await expect(transportGoButton(page)).toBeVisible();
  await expect(page.getByRole("complementary", { name: "Hot cues" })).toBeVisible();

  const assetsPanel = page.locator('[data-gsc-drop-zone="assets"]');
  const mainCueList = page.locator('[data-gsc-drop-zone="cue-list"]');
  const panel = hotCuePanel(page);

  await expect(assetsPanel.getByText("No assets yet")).toBeVisible();
  await expect(mainCueList.getByText(WHITE_NOISE_ALT_NAME)).toHaveCount(0);
  await expect(
    panel.getByText("Drop assets here or use the flame button to add hot cues."),
  ).toBeVisible();

  await dropAudioOnHotCuePanel(page);

  await expect(panel.getByText(WHITE_NOISE_ALT_NAME, { exact: true })).toBeVisible();
  await expect(panel.getByRole("button", { name: "GO", exact: true })).toBeVisible();
  await expect(mainCueList.getByText(WHITE_NOISE_ALT_NAME)).toHaveCount(0);
  await expect(assetsPanel.getByText(WHITE_NOISE_ALT_NAME, { exact: true })).toBeVisible();
});
