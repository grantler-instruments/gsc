import { expect, test } from "@playwright/test";
import { transportGoButton } from "./helpers/active-cues";
import { gotoApp } from "./helpers/app";
import {
  createStopForCue,
  expectTargetHighlightsOnHoverAndSelect,
  panFadeCueRowForTarget,
  setupAudioTargetCue,
  stopCueRowForTarget,
  volumeFadeCueRowForTarget,
} from "./helpers/cue-target-highlight";
import { fixturePath } from "./helpers/drop-audio";

const PLAYBACK_WAV = "white-noise-playback.wav";

test.describe.configure({ mode: "serial" });

test("stop cue highlights its target on hover and selection", async ({ page }) => {
  await gotoApp(page, { resetStorage: true });
  await expect(transportGoButton(page)).toBeVisible();

  await setupAudioTargetCue(page, fixturePath(PLAYBACK_WAV), PLAYBACK_WAV, "audio/wav");
  await createStopForCue(page, PLAYBACK_WAV);

  const stopRow = await stopCueRowForTarget(page, PLAYBACK_WAV);
  await expectTargetHighlightsOnHoverAndSelect(page, PLAYBACK_WAV, stopRow);
});

test("volume fade cue highlights its target on hover and selection", async ({ page }) => {
  await gotoApp(page, { resetStorage: true });
  await expect(transportGoButton(page)).toBeVisible();

  await setupAudioTargetCue(page, fixturePath(PLAYBACK_WAV), PLAYBACK_WAV, "audio/wav");
  const fadeRow = await volumeFadeCueRowForTarget(page, PLAYBACK_WAV);
  await expectTargetHighlightsOnHoverAndSelect(page, PLAYBACK_WAV, fadeRow);
});

test("pan fade cue highlights its target on hover and selection", async ({ page }) => {
  await gotoApp(page, { resetStorage: true });
  await expect(transportGoButton(page)).toBeVisible();

  await setupAudioTargetCue(page, fixturePath(PLAYBACK_WAV), PLAYBACK_WAV, "audio/wav");
  const fadeRow = await panFadeCueRowForTarget(page, PLAYBACK_WAV);
  await expectTargetHighlightsOnHoverAndSelect(page, PLAYBACK_WAV, fadeRow);
});
