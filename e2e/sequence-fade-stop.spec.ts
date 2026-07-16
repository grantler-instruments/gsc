import { expect, test } from "@playwright/test";
import {
  activeCueRow,
  expectActiveCueStopped,
  openActiveCuesTab,
  pressTransportGo,
} from "./helpers/active-cues";
import { addCueType } from "./helpers/add-cue";
import { gotoApp } from "./helpers/app";
import { dragCueIntoContainer, expandContainerCue } from "./helpers/container-cues";
import { containerCueRow, selectSequenceCueRow, sequenceCueRow } from "./helpers/cue-list-panel";
import {
  createStopForCue,
  readCueNumber,
  setupAudioTargetCue,
  stopCueDisplayName,
} from "./helpers/cue-target-highlight";
import { fixturePath } from "./helpers/drop-audio";
import {
  createVolumeFadeForCue,
  enableLoopPlayback,
  expectActiveCueLevelToDecrease,
  fadeCueDisplayName,
  setFadeDuration,
} from "./helpers/fade-cues";

const PLAYBACK_WAV = "white-noise-playback.wav";

test.describe.configure({ mode: "serial" });

test("sequence fades audio out then stops it @structure", async ({ page }) => {
  test.setTimeout(60_000);

  await page.setViewportSize({ width: 1440, height: 900 });
  await gotoApp(page, { resetStorage: true });

  await setupAudioTargetCue(page, fixturePath(PLAYBACK_WAV), PLAYBACK_WAV, "audio/wav");
  await selectSequenceCueRow(page, PLAYBACK_WAV);
  await enableLoopPlayback(page);
  await createVolumeFadeForCue(page, PLAYBACK_WAV);
  await createStopForCue(page, PLAYBACK_WAV);

  const fadeName = fadeCueDisplayName("Volume fade", PLAYBACK_WAV);
  const targetNumber = await readCueNumber(sequenceCueRow(page, PLAYBACK_WAV));
  const stopName = stopCueDisplayName(targetNumber, PLAYBACK_WAV);

  await addCueType(page, "Sequence");
  await dragCueIntoContainer(page, fadeName, "Sequence");
  await dragCueIntoContainer(page, stopName, "Sequence");
  await expandContainerCue(page, "Sequence");

  await expect(
    containerCueRow(page, "Sequence").getByText(/2 cue\(s\) · sequential/),
  ).toBeVisible();

  await selectSequenceCueRow(page, fadeName);
  await setFadeDuration(page, 2);

  await openActiveCuesTab(page);
  await selectSequenceCueRow(page, PLAYBACK_WAV);
  await pressTransportGo(page);
  await expect(activeCueRow(page, PLAYBACK_WAV)).toBeVisible({ timeout: 10_000 });

  await containerCueRow(page, "Sequence").click();
  await pressTransportGo(page);

  await expect(containerCueRow(page, "Sequence").getByText("Playing step 1 of 2")).toBeVisible();

  await expectActiveCueLevelToDecrease(page, PLAYBACK_WAV, "Vol");

  await expect(containerCueRow(page, "Sequence").getByText("Playing step 2 of 2")).toBeVisible({
    timeout: 10_000,
  });

  await expectActiveCueStopped(page, PLAYBACK_WAV);
});
