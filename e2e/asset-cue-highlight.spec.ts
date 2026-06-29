import { expect, test } from "@playwright/test";
import { transportGoButton } from "./helpers/active-cues";
import { gotoApp } from "./helpers/app";
import { sequenceCueRow } from "./helpers/cue-list-panel";
import {
  clearCueTargetHighlightState,
  expectCueRowTargetHighlighted,
  expectCueRowTargetNotHighlighted,
} from "./helpers/cue-target-highlight";
import { dropAudioOnCueList, fixturePath } from "./helpers/drop-audio";

const PLAYBACK_WAV = "white-noise-playback.wav";

test("hovering an asset highlights cues that use it", async ({ page }) => {
  test.setTimeout(60_000);

  await gotoApp(page, { resetStorage: true });
  await expect(transportGoButton(page)).toBeVisible();

  await dropAudioOnCueList(page, fixturePath(PLAYBACK_WAV), PLAYBACK_WAV, "audio/wav");
  const cueRow = sequenceCueRow(page, PLAYBACK_WAV);
  await expect(cueRow).toHaveCount(1);

  const assetsPanel = page.locator('[data-gsc-drop-zone="assets"]');
  const assetRow = assetsPanel.locator("[data-asset-path]", {
    has: page.getByText(PLAYBACK_WAV, { exact: true }),
  });
  await expect(assetRow).toHaveCount(1);

  await clearCueTargetHighlightState(page, PLAYBACK_WAV);
  await expectCueRowTargetNotHighlighted(cueRow);

  await assetRow.hover();
  await expectCueRowTargetHighlighted(cueRow);

  await transportGoButton(page).hover();
  await expectCueRowTargetNotHighlighted(cueRow);

  await assetRow.hover();
  await expectCueRowTargetHighlighted(cueRow);

  await page.waitForTimeout(2_100);
  await expectCueRowTargetHighlighted(cueRow);
});
