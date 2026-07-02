import { expect, type Page } from "@playwright/test";
import {
  expectOutputPlaybackStableOnPage,
  OUTPUT_VIDEO_LOAD_MAX_MS,
  readOutputVideoState,
} from "../shared/output-window";
import { getWaveformPositionSec } from "./active-cues";

export { OUTPUT_VIDEO_LOAD_MAX_MS } from "../shared/output-window";
/** test-video-playback.mp4 slice length (see generate-video-fixtures.mjs). */
export const PLAYBACK_VIDEO_SLICE_SEC = 4;
/** Observed steady-state headless Chromium: ~70–85ms; allow more on loaded CI runners. */
export const MAX_PLAYBACK_DRIFT_SEC = 0.35;
export const MAX_DRIFT_GROWTH_SEC = 0.09;
const STEADY_DRIFT_CAP_SEC = 0.4;

export function outputButton(page: Page) {
  return page.getByRole("button", { name: "Output" });
}

export function outputStage(page: Page) {
  return page.locator("[data-gsc-output-stage]");
}

export function outputStageVideo(page: Page) {
  return outputStage(page).locator("video");
}

/** Open the audience output window and wait until the output app is ready. */
export async function openOutputWindow(page: Page): Promise<Page> {
  const [outputPage] = await Promise.all([page.waitForEvent("popup"), outputButton(page).click()]);

  await outputPage.waitForLoadState("domcontentloaded");
  await expect(outputPage).toHaveURL(/mode=output/);
  await expect(outputStage(outputPage)).toBeVisible({ timeout: 30_000 });

  return outputPage;
}

export interface OutputVideoState {
  currentTimeSec: number;
  readyState: number;
  paused: boolean;
}

export async function getOutputVideoState(outputPage: Page): Promise<OutputVideoState | null> {
  return outputPage.evaluate(readOutputVideoState);
}

function isOutputVideoPlaying(state: OutputVideoState | null): boolean {
  return state !== null && state.readyState >= 2 && !state.paused && state.currentTimeSec > 0;
}

/** Milliseconds until the output video is playing, measured from `startedAtMs`. */
export async function waitForOutputVideoPlaying(
  outputPage: Page,
  startedAtMs: number,
  timeoutMs = 20_000,
): Promise<number> {
  let loadMs = 0;

  await expect
    .poll(
      async () => {
        const state = await getOutputVideoState(outputPage);
        if (isOutputVideoPlaying(state)) {
          loadMs = Date.now() - startedAtMs;
          return true;
        }
        return false;
      },
      { timeout: timeoutMs },
    )
    .toBe(true);

  return loadMs;
}

export async function expectOutputVideoLoadsWithin(
  outputPage: Page,
  startedAtMs: number,
  maxMs = OUTPUT_VIDEO_LOAD_MAX_MS,
): Promise<number> {
  const loadMs = await waitForOutputVideoPlaying(outputPage, startedAtMs);
  expect(loadMs, `output video took ${loadMs}ms to start (limit ${maxMs}ms)`).toBeLessThanOrEqual(
    maxMs,
  );
  return loadMs;
}

export interface PlaybackDriftSample {
  controlSec: number;
  outputSec: number;
  driftSec: number;
}

export interface PlaybackDriftMeasurement {
  samples: PlaybackDriftSample[];
  maxDriftSec: number;
  minDriftSec: number;
  driftGrowthSec: number;
  rawMaxDriftSec: number;
}

/** Drift on a looping slice — treats positions as circular to ignore wrap artifacts. */
export function driftSecWithinSlice(
  controlSec: number,
  outputSec: number,
  sliceSec: number,
): number {
  const wrap = (value: number) => ((value % sliceSec) + sliceSec) % sliceSec;
  const a = wrap(controlSec);
  const b = wrap(outputSec);
  const diff = Math.abs(a - b);
  return Math.min(diff, sliceSec - diff);
}

function summarizeDriftSamples(samples: PlaybackDriftSample[]): PlaybackDriftMeasurement {
  const drifts = samples.map((sample) => sample.driftSec);
  const steadyDrifts = drifts.filter((drift) => drift <= STEADY_DRIFT_CAP_SEC);
  const measured = steadyDrifts.length > 0 ? steadyDrifts : drifts;
  const maxDriftSec = Math.max(...measured);
  const minDriftSec = Math.min(...measured);

  return {
    samples,
    maxDriftSec,
    minDriftSec,
    driftGrowthSec: maxDriftSec - minDriftSec,
    rawMaxDriftSec: Math.max(...drifts),
  };
}

/** Absolute difference between control waveform position and output video time. */
export async function getPlaybackDriftSec(
  controlPage: Page,
  outputPage: Page,
  cueName: string,
  sliceSec = PLAYBACK_VIDEO_SLICE_SEC,
): Promise<number> {
  const sample = await samplePlaybackDrift(controlPage, outputPage, cueName, sliceSec);
  return sample.driftSec;
}

async function samplePlaybackDrift(
  controlPage: Page,
  outputPage: Page,
  cueName: string,
  sliceSec: number,
): Promise<PlaybackDriftSample> {
  const [controlSec, outputState] = await Promise.all([
    getWaveformPositionSec(controlPage, cueName),
    getOutputVideoState(outputPage),
  ]);
  const outputSec = outputState?.currentTimeSec ?? 0;
  return {
    controlSec,
    outputSec,
    driftSec: driftSecWithinSlice(controlSec, outputSec, sliceSec),
  };
}

/**
 * Sample drift while both windows play.
 * Returns per-sample control/output positions for reporting.
 */
export async function measurePlaybackDrift(
  controlPage: Page,
  outputPage: Page,
  cueName: string,
  options: {
    warmupSec?: number;
    sampleDurationSec?: number;
    sampleIntervalMs?: number;
    sliceSec?: number;
  } = {},
): Promise<PlaybackDriftMeasurement> {
  const {
    warmupSec = 0.8,
    sampleDurationSec = 2.5,
    sampleIntervalMs = 500,
    sliceSec = PLAYBACK_VIDEO_SLICE_SEC,
  } = options;

  await expect
    .poll(async () => getWaveformPositionSec(controlPage, cueName), { timeout: 15_000 })
    .toBeGreaterThan(warmupSec);

  await expect
    .poll(async () => (await getOutputVideoState(outputPage))?.currentTimeSec ?? 0, {
      timeout: 15_000,
    })
    .toBeGreaterThan(warmupSec * 0.5);

  const samples: PlaybackDriftSample[] = [];
  const sampleCount = Math.ceil((sampleDurationSec * 1000) / sampleIntervalMs);

  for (let i = 0; i < sampleCount; i++) {
    samples.push(await samplePlaybackDrift(controlPage, outputPage, cueName, sliceSec));
    if (i < sampleCount - 1) {
      await controlPage.waitForTimeout(sampleIntervalMs);
    }
  }

  return summarizeDriftSamples(samples);
}

/**
 * Sample drift while both windows play and assert it stays within bounds.
 * Catches sustained A/V desync between the control clock and output video element.
 */
export async function expectPlaybackSyncStable(
  controlPage: Page,
  outputPage: Page,
  cueName: string,
  options: {
    warmupSec?: number;
    sampleDurationSec?: number;
    sampleIntervalMs?: number;
    maxDriftSec?: number;
    maxDriftGrowthSec?: number;
  } = {},
): Promise<PlaybackDriftMeasurement> {
  const {
    maxDriftSec = MAX_PLAYBACK_DRIFT_SEC,
    maxDriftGrowthSec = MAX_DRIFT_GROWTH_SEC,
    ...measureOptions
  } = options;

  const measurement = await measurePlaybackDrift(controlPage, outputPage, cueName, measureOptions);
  const sampleLabel = measurement.samples.map((sample) => sample.driftSec.toFixed(2)).join("s, ");

  expect(
    measurement.maxDriftSec,
    `playback drift exceeded ${maxDriftSec}s (samples: ${sampleLabel}s)`,
  ).toBeLessThanOrEqual(maxDriftSec);
  expect(
    measurement.driftGrowthSec,
    `playback drift grew by ${measurement.driftGrowthSec.toFixed(2)}s (samples: ${sampleLabel}s)`,
  ).toBeLessThanOrEqual(maxDriftGrowthSec);

  return measurement;
}

/** Wait until the output window video element is playing and its time advances. */
export async function expectOutputVideoPlaybackToAdvance(outputPage: Page): Promise<void> {
  const video = outputStageVideo(outputPage);
  await expect(video).toBeVisible({ timeout: 20_000 });

  await expect
    .poll(async () => (await getOutputVideoState(outputPage))?.currentTimeSec ?? 0, {
      timeout: 20_000,
    })
    .toBeGreaterThan(0);

  const firstSample = (await getOutputVideoState(outputPage))?.currentTimeSec ?? 0;

  await expect
    .poll(async () => (await getOutputVideoState(outputPage))?.currentTimeSec ?? 0, {
      timeout: 15_000,
    })
    .toBeGreaterThan(firstSample);
}

/** Assert the output popup keeps one video element mounted and does not reload during playback. */
export async function expectOutputPlaybackStable(
  outputPage: Page,
  options: { stableMs?: number; advanceMs?: number } = {},
): Promise<void> {
  await expectOutputPlaybackStableOnPage(outputPage, options);
}
