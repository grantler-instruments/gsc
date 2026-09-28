import { expect, type Page, test } from "@playwright/test";
import {
  getWaveformPositionSec,
  openActiveCuesTab,
  pressPanic,
  pressTransportGo,
  transportGoButton,
} from "./helpers/active-cues";
import { gotoApp } from "./helpers/app";
import { expectCueInSequenceList, sequenceCueRow } from "./helpers/cue-list-panel";
import { dropAudioOnCueList, fixturePath } from "./helpers/drop-audio";
import { enableLoopPlayback } from "./helpers/fade-cues";
import {
  prepareLoopCue,
  setInfiniteLoopIterations,
  startSelectedLoopCue,
} from "./helpers/loop-playback";
import {
  expectOutputPlaybackStable,
  expectOutputVideoLoadsWithin,
  expectOutputVideoPlaybackToAdvance,
  expectPlaybackSyncStable,
  OUTPUT_VIDEO_MID_PLAYBACK_LOAD_MAX_MS,
  openOutputWindow,
  outputButton,
  PLAYBACK_VIDEO_SLICE_SEC,
} from "./helpers/output-window";

test.describe.configure({ mode: "serial" });

const VIDEO_FIXTURE = "test-video-playback.mp4";

async function setupVideoCue(page: Page) {
  await gotoApp(page);
  await dropAudioOnCueList(page, fixturePath(VIDEO_FIXTURE), VIDEO_FIXTURE, "video/mp4");
  await expectCueInSequenceList(page, VIDEO_FIXTURE);
  // Fixture slice is 4s — loop so load + stable windows do not outlive playback.
  await sequenceCueRow(page, VIDEO_FIXTURE).click();
  await enableLoopPlayback(page);
  await setInfiniteLoopIterations(page);
  await expect(outputButton(page)).toBeVisible();
}

test("output window plays video when cue is triggered", async ({ page }) => {
  test.setTimeout(60_000);

  await setupVideoCue(page);
  const outputPage = await openOutputWindow(page);

  await openActiveCuesTab(page);
  await expect(transportGoButton(page)).toBeEnabled();
  await pressTransportGo(page);

  await expectOutputVideoPlaybackToAdvance(outputPage);

  await pressPanic(page);
  await outputPage.close();
});

test("output window video loads quickly after GO", async ({ page }) => {
  test.setTimeout(60_000);

  await setupVideoCue(page);
  const outputPage = await openOutputWindow(page);

  await openActiveCuesTab(page);
  await expect(transportGoButton(page)).toBeEnabled();

  const goAtMs = Date.now();
  await pressTransportGo(page);
  const loadMs = await expectOutputVideoLoadsWithin(outputPage, goAtMs);

  test.info().annotations.push({
    type: "output-video-load-ms",
    description: String(loadMs),
  });

  await pressPanic(page);
  await outputPage.close();
});

test("output window keeps a single video element without reloading during playback", async ({
  page,
}) => {
  test.setTimeout(60_000);

  await setupVideoCue(page);
  const outputPage = await openOutputWindow(page);

  await openActiveCuesTab(page);
  await expect(transportGoButton(page)).toBeEnabled();

  const goAtMs = Date.now();
  await pressTransportGo(page);
  await expectOutputVideoLoadsWithin(outputPage, goAtMs);
  await expectOutputPlaybackStable(outputPage, { sliceSec: PLAYBACK_VIDEO_SLICE_SEC });

  await pressPanic(page);
  await outputPage.close();
});

test("output window video loads quickly when opened during playback", async ({ page }) => {
  test.setTimeout(60_000);

  await setupVideoCue(page);

  await openActiveCuesTab(page);
  await pressTransportGo(page);
  await expect
    .poll(async () => getWaveformPositionSec(page, VIDEO_FIXTURE), { timeout: 15_000 })
    .toBeGreaterThan(1);

  const openAtMs = Date.now();
  const outputPage = await openOutputWindow(page);
  const loadMs = await expectOutputVideoLoadsWithin(
    outputPage,
    openAtMs,
    OUTPUT_VIDEO_MID_PLAYBACK_LOAD_MAX_MS,
    { requirePlaying: false },
  );

  test.info().annotations.push({
    type: "output-video-mid-playback-load-ms",
    description: String(loadMs),
  });

  await pressPanic(page);
  await outputPage.close();
});

test("output window video stays in sync with control during playback", async ({ page }) => {
  test.setTimeout(60_000);

  await prepareLoopCue(page, VIDEO_FIXTURE, "video/mp4", { infinite: true });
  await expect(outputButton(page)).toBeVisible();
  const outputPage = await openOutputWindow(page);
  const goAtMs = Date.now();
  await startSelectedLoopCue(page, VIDEO_FIXTURE);
  await expectOutputVideoLoadsWithin(outputPage, goAtMs);

  await expectPlaybackSyncStable(page, outputPage, VIDEO_FIXTURE, {
    warmupSec: 2,
    sampleDurationSec: 1.5,
    sampleIntervalMs: 500,
  });

  await pressPanic(page);
  await outputPage.close();
});

test("output window video drift over 30s of looped playback", async ({ page }) => {
  test.setTimeout(120_000);

  await prepareLoopCue(page, VIDEO_FIXTURE, "video/mp4", { infinite: true });
  await expect(outputButton(page)).toBeVisible();

  const outputPage = await openOutputWindow(page);
  const goAtMs = Date.now();
  await startSelectedLoopCue(page, VIDEO_FIXTURE);
  await expectOutputVideoLoadsWithin(outputPage, goAtMs);

  const measurement = await expectPlaybackSyncStable(page, outputPage, VIDEO_FIXTURE, {
    warmupSec: 2,
    sampleDurationSec: 30,
    sampleIntervalMs: 1_000,
  });

  const driftSeries = measurement.samples
    .map((sample) => `${sample.driftSec.toFixed(3)}s`)
    .join(", ");

  test
    .info()
    .annotations.push(
      { type: "drift-max-sec", description: measurement.maxDriftSec.toFixed(3) },
      { type: "drift-raw-max-sec", description: measurement.rawMaxDriftSec.toFixed(3) },
      { type: "drift-growth-sec", description: measurement.driftGrowthSec.toFixed(3) },
      { type: "drift-samples", description: driftSeries },
    );

  console.log(
    `[30s drift] steady max=${measurement.maxDriftSec.toFixed(3)}s raw max=${measurement.rawMaxDriftSec.toFixed(3)}s growth=${measurement.driftGrowthSec.toFixed(3)}s samples=[${driftSeries}]`,
  );

  await pressPanic(page);
  await outputPage.close();
});
