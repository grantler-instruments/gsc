import { expect, test } from "@playwright/test";
import { openActiveCuesTab, pressTransportGo, transportGoButton } from "./helpers/active-cues";
import { selectSequenceCueRow, sequenceCueRow } from "./helpers/cue-list-panel";
import { dropAudioOnCueList, fixturePath } from "./helpers/drop-audio";
import {
  createPanFadeForCue,
  createVolumeFadeForCue,
  enableLoopPlayback,
  expectActiveCueLevelToDecrease,
  fadeCueDisplayName,
  setFadeDuration,
  setInspectorPan,
} from "./helpers/fade-cues";

const PLAYBACK_WAV = "white-noise-playback.wav";

test.describe.configure({ mode: "serial" });

test("volume fade cue appears in the list and fades volume in Active cues", async ({ page }) => {
  test.setTimeout(60_000);

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("./");
  await expect(transportGoButton(page)).toBeVisible();

  await dropAudioOnCueList(page, fixturePath(PLAYBACK_WAV), PLAYBACK_WAV, "audio/wav");
  await selectSequenceCueRow(page, PLAYBACK_WAV);
  await enableLoopPlayback(page);
  await createVolumeFadeForCue(page, PLAYBACK_WAV);

  const fadeName = fadeCueDisplayName("Volume fade", PLAYBACK_WAV);
  await expect(sequenceCueRow(page, fadeName)).toHaveCount(1);
  await selectSequenceCueRow(page, fadeName);
  await setFadeDuration(page, 10);

  await openActiveCuesTab(page);
  await selectSequenceCueRow(page, PLAYBACK_WAV);
  await pressTransportGo(page);
  await pressTransportGo(page);

  await expectActiveCueLevelToDecrease(page, PLAYBACK_WAV, "Vol");
});

test("pan fade cue appears in the list and fades pan in Active cues", async ({ page }) => {
  test.setTimeout(60_000);

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("./");
  await expect(transportGoButton(page)).toBeVisible();

  await dropAudioOnCueList(page, fixturePath(PLAYBACK_WAV), PLAYBACK_WAV, "audio/wav");
  await selectSequenceCueRow(page, PLAYBACK_WAV);
  await setInspectorPan(page, 1);
  await enableLoopPlayback(page);
  await createPanFadeForCue(page, PLAYBACK_WAV);

  const fadeName = fadeCueDisplayName("Pan fade", PLAYBACK_WAV);
  await expect(sequenceCueRow(page, fadeName)).toHaveCount(1);
  await selectSequenceCueRow(page, fadeName);
  await setFadeDuration(page, 10);

  await openActiveCuesTab(page);
  await selectSequenceCueRow(page, PLAYBACK_WAV);
  await pressTransportGo(page);
  await pressTransportGo(page);

  await expectActiveCueLevelToDecrease(page, PLAYBACK_WAV, "Pan");
});
