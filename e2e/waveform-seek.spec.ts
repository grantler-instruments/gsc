import { expect, type Page, test } from "@playwright/test";
import {
  activeCueRow,
  activeCueWaveformSeek,
  getWaveformPositionSec,
  openActiveCuesTab,
  pressTransportGo,
  seekWaveformAtRatio,
  transportGoButton,
} from "./helpers/active-cues";
import { expectCueInSequenceList } from "./helpers/cue-list-panel";
import { dropAudioOnCueList, fixturePath } from "./helpers/drop-audio";

test.describe.configure({ mode: "serial" });

const AUDIO_FIXTURE = "white-noise-playback.wav";
const VIDEO_FIXTURE = "test-video-playback.mp4";

async function startPlayingCue(page: Page, fileName: string, mimeType: string): Promise<void> {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("./");

  await expect(transportGoButton(page)).toBeVisible();

  await dropAudioOnCueList(page, fixturePath(fileName), fileName, mimeType);
  await expectCueInSequenceList(page, fileName);
  await openActiveCuesTab(page);
  await pressTransportGo(page);

  await expect(activeCueRow(page, fileName)).toBeVisible();
  await expect(activeCueWaveformSeek(page, fileName)).toBeVisible();

  await expect
    .poll(async () => getWaveformPositionSec(page, fileName), { timeout: 15_000 })
    .toBeGreaterThan(1);
}

async function expectWaveformSeekChangesPosition(
  page: Page,
  cueName: string,
  ratio: number,
  compare: "backward" | "forward",
): Promise<void> {
  const before = await getWaveformPositionSec(page, cueName);
  await seekWaveformAtRatio(page, cueName, ratio);

  const poll = expect.poll(async () => getWaveformPositionSec(page, cueName), {
    timeout: 10_000,
  });

  if (compare === "backward") {
    await poll.toBeLessThan(before - 0.4);
  } else {
    await poll.toBeGreaterThan(before + 0.4);
  }
}

test(`seeking ${AUDIO_FIXTURE} waveform jumps playback position`, async ({ page }) => {
  test.setTimeout(60_000);

  await startPlayingCue(page, AUDIO_FIXTURE, "audio/wav");
  await expectWaveformSeekChangesPosition(page, AUDIO_FIXTURE, 0.1, "backward");
  await expectWaveformSeekChangesPosition(page, AUDIO_FIXTURE, 0.85, "forward");
});

test(`seeking ${VIDEO_FIXTURE} waveform jumps playback position`, async ({ page }) => {
  test.setTimeout(60_000);

  await startPlayingCue(page, VIDEO_FIXTURE, "video/mp4");
  await expectWaveformSeekChangesPosition(page, VIDEO_FIXTURE, 0.1, "backward");
  await expectWaveformSeekChangesPosition(page, VIDEO_FIXTURE, 0.85, "forward");
});
