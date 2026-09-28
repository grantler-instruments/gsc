import type { Page } from "@playwright/test";

const isCi = !!process.env.CI;

export const OUTPUT_VIDEO_LOAD_MAX_MS = isCi ? 12_000 : 5_000;
/** Opening the output popup mid-playback must fetch the asset blob over BroadcastChannel. */
export const OUTPUT_VIDEO_MID_PLAYBACK_LOAD_MAX_MS = isCi ? 25_000 : 12_000;
export const OUTPUT_STABLE_MS = isCi ? 3_000 : 2_000;
export const OUTPUT_VIDEO_POLL_TIMEOUT_MS = isCi ? 45_000 : 20_000;
export const OUTPUT_VIDEO_COUNT_WAIT_MS = isCi ? 20_000 : 10_000;
/** Consecutive polls that must see the expected video count (ignores brief sync glitches). */
export const OUTPUT_VIDEO_COUNT_STABLE_POLLS = isCi ? 3 : 1;

export interface OutputVideoState {
  currentTimeSec: number;
  readyState: number;
  paused: boolean;
}

export function readOutputVideoState(): OutputVideoState | null {
  const video = document.querySelector<HTMLVideoElement>("[data-gsc-output-stage] video");
  if (!video) return null;
  return {
    currentTimeSec: video.currentTime,
    readyState: video.readyState,
    paused: video.paused,
  };
}

export function readOutputVideoElementCount(): number {
  return document.querySelectorAll("[data-gsc-output-stage] video").length;
}

export function readOutputPageNavigationCount(): number {
  return performance.getEntriesByType("navigation").length;
}

export function isOutputVideoPlaying(state: OutputVideoState | null): boolean {
  return state !== null && state.readyState >= 2 && !state.paused && state.currentTimeSec > 0;
}

/** Loaded and seeked — mid-playback catch-up may resolve before play() settles. */
export function isOutputVideoReady(state: OutputVideoState | null): boolean {
  return state !== null && state.readyState >= 2 && state.currentTimeSec > 0;
}

export async function waitForOutputVideoPlaying(
  evaluate: <T>(fn: () => T) => Promise<T>,
  startedAtMs: number,
  timeoutMs = 20_000,
): Promise<number> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const state = await evaluate(readOutputVideoState);
    if (isOutputVideoPlaying(state)) {
      return Date.now() - startedAtMs;
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error("Timed out waiting for output video to start playing");
}

/** True when playback moved forward or wrapped on a looping slice. */
export function outputVideoTimeAdvanced(
  beforeSec: number,
  afterSec: number,
  sliceSec?: number,
): boolean {
  if (afterSec > beforeSec + 0.02) return true;
  if (sliceSec === undefined || sliceSec <= 0) return false;
  return beforeSec > sliceSec * 0.7 && afterSec < sliceSec * 0.3;
}

async function waitForVideoTimeAdvance(
  readTimeSec: () => Promise<number>,
  wait: (ms: number) => Promise<void>,
  fromSec: number,
  timeoutMs: number,
  sliceSec?: number,
): Promise<number> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    await wait(200);
    const nowSec = await readTimeSec();
    if (outputVideoTimeAdvanced(fromSec, nowSec, sliceSec)) {
      return nowSec;
    }
  }
  throw new Error("Output video did not advance during stable window");
}

export async function expectOutputPlaybackStable(
  evaluate: <T>(fn: () => T) => Promise<T>,
  wait: (ms: number) => Promise<void>,
  options: { stableMs?: number; advanceMs?: number; sliceSec?: number } = {},
): Promise<void> {
  const stableMs = options.stableMs ?? OUTPUT_STABLE_MS;
  const advanceMs = options.advanceMs ?? 500;
  const sliceSec = options.sliceSec;
  const navigationCount = await evaluate(readOutputPageNavigationCount);

  const waitForVideoCount = async (count: number) => {
    const deadline = Date.now() + OUTPUT_VIDEO_COUNT_WAIT_MS;
    let stablePolls = 0;
    while (Date.now() < deadline) {
      const videoCount = await evaluate(readOutputVideoElementCount);
      if (videoCount === count) {
        stablePolls += 1;
        if (stablePolls >= OUTPUT_VIDEO_COUNT_STABLE_POLLS) return;
      } else {
        stablePolls = 0;
      }
      await wait(200);
    }
    const lastCount = await evaluate(readOutputVideoElementCount);
    throw new Error(`Expected ${count} output video element(s), last saw ${lastCount}`);
  };

  const readTimeSec = async () => (await evaluate(readOutputVideoState))?.currentTimeSec ?? 0;

  await waitForVideoCount(1);

  const beforeStable = await readTimeSec();
  const midStable = await waitForVideoTimeAdvance(
    readTimeSec,
    wait,
    beforeStable,
    stableMs,
    sliceSec,
  );

  if ((await evaluate(readOutputPageNavigationCount)) !== navigationCount) {
    throw new Error("Output page reloaded during stable playback window");
  }
  await waitForVideoCount(1);

  await waitForVideoTimeAdvance(readTimeSec, wait, midStable, advanceMs + 1000, sliceSec);
}

/** Playwright popup adapter — reuses shared output assertions. */
export async function expectOutputPlaybackStableOnPage(
  outputPage: Page,
  options?: { stableMs?: number; advanceMs?: number; sliceSec?: number },
): Promise<void> {
  const stableMs = options.stableMs ?? OUTPUT_STABLE_MS;
  const advanceMs = options.advanceMs ?? 500;
  const sliceSec = options.sliceSec;
  await outputPage.bringToFront();
  const navigationCount = await outputPage.evaluate(
    () => performance.getEntriesByType("navigation").length,
  );

  const waitForVideoCount = async (count: number) => {
    const deadline = Date.now() + OUTPUT_VIDEO_COUNT_WAIT_MS;
    let stablePolls = 0;
    while (Date.now() < deadline) {
      const videoCount = await outputPage.evaluate(
        () => document.querySelectorAll("[data-gsc-output-stage] video").length,
      );
      if (videoCount === count) {
        stablePolls += 1;
        if (stablePolls >= OUTPUT_VIDEO_COUNT_STABLE_POLLS) return;
      } else {
        stablePolls = 0;
      }
      await outputPage.waitForTimeout(200);
    }
    const lastCount = await outputPage.evaluate(
      () => document.querySelectorAll("[data-gsc-output-stage] video").length,
    );
    throw new Error(`Expected ${count} output video element(s), last saw ${lastCount}`);
  };

  const readVideoTime = () =>
    outputPage.evaluate(() => {
      const video = document.querySelector<HTMLVideoElement>("[data-gsc-output-stage] video");
      return video?.currentTime ?? 0;
    });

  const nudgePlayback = () =>
    outputPage.evaluate(() => {
      const video = document.querySelector<HTMLVideoElement>("[data-gsc-output-stage] video");
      if (video?.paused) {
        void video.play().catch(() => {});
      }
    });

  await waitForVideoCount(1);
  await nudgePlayback();

  const beforeStable = await readVideoTime();
  const midStable = await waitForVideoTimeAdvance(
    async () => {
      await nudgePlayback();
      return readVideoTime();
    },
    (ms) => outputPage.waitForTimeout(ms),
    beforeStable,
    stableMs,
    sliceSec,
  );

  if (
    (await outputPage.evaluate(() => performance.getEntriesByType("navigation").length)) !==
    navigationCount
  ) {
    throw new Error("Output page reloaded during stable playback window");
  }
  await waitForVideoCount(1);

  await waitForVideoTimeAdvance(
    async () => {
      await nudgePlayback();
      return readVideoTime();
    },
    (ms) => outputPage.waitForTimeout(ms),
    midStable,
    advanceMs + 1000,
    sliceSec,
  );
}

export async function expectOutputVideoLoadsWithinOnPage(
  outputPage: Page,
  startedAtMs: number,
  maxMs = OUTPUT_VIDEO_LOAD_MAX_MS,
): Promise<number> {
  const deadline = Date.now() + OUTPUT_VIDEO_POLL_TIMEOUT_MS;
  while (Date.now() < deadline) {
    const state = await outputPage.evaluate(() => {
      const video = document.querySelector<HTMLVideoElement>("[data-gsc-output-stage] video");
      if (!video) return null;
      return {
        currentTimeSec: video.currentTime,
        readyState: video.readyState,
        paused: video.paused,
      };
    });
    if (state !== null && isOutputVideoReady(state)) {
      const loadMs = Date.now() - startedAtMs;
      if (loadMs > maxMs) {
        throw new Error(`Output video took ${loadMs}ms to start (limit ${maxMs}ms)`);
      }
      return loadMs;
    }
    await outputPage.waitForTimeout(200);
  }
  throw new Error("Timed out waiting for output video to start playing");
}
