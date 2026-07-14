import { expect, test } from "@playwright/test";
import {
  activeCuesPanel,
  expectActiveCueStopped,
  expectPlaybackProgressToAdvance,
  openActiveCuesTab,
  pressTransportGo,
  transportGoButton,
} from "./helpers/active-cues";
import { gotoApp } from "./helpers/app";
import { selectSequenceCueRow } from "./helpers/cue-list-panel";
import {
  createStopForCue,
  setupAudioTargetCue,
  stopCueRowForTarget,
} from "./helpers/cue-target-highlight";
import { fixturePath } from "./helpers/drop-audio";

const PLAYBACK_WAV = "white-noise-playback.wav";

test.describe.configure({ mode: "serial" });

test("stop cue ends active playback", async ({ page }) => {
  test.setTimeout(60_000);

  await gotoApp(page, { resetStorage: true });
  await expect(transportGoButton(page)).toBeVisible();

  await setupAudioTargetCue(page, fixturePath(PLAYBACK_WAV), PLAYBACK_WAV, "audio/wav");
  await createStopForCue(page, PLAYBACK_WAV);
  const stopRow = await stopCueRowForTarget(page, PLAYBACK_WAV);

  await selectSequenceCueRow(page, PLAYBACK_WAV);
  await openActiveCuesTab(page);
  await pressTransportGo(page);

  await expect(activeCuesPanel(page).getByRole("button", { name: "Stop all" })).toBeVisible();
  await expectPlaybackProgressToAdvance(page, PLAYBACK_WAV);

  await stopRow.click();
  await pressTransportGo(page);
  await expectActiveCueStopped(page, PLAYBACK_WAV);
});
