import type { Page } from "@playwright/test";

export const OUTPUT_VIDEO_LOAD_MAX_MS = 5_000;
export const OUTPUT_STABLE_MS = 2_000;

export interface OutputVideoState {
  currentTimeSec: number;
  readyState: number;
  paused: boolean;
}

export function readOutputVideoState(_unused?: void): OutputVideoState | null {
  const video = document.querySelector<HTMLVideoElement>("[data-gsc-output-stage] video");
  if (!video) return null;
  return {
    currentTimeSec: video.currentTime,
    readyState: video.readyState,
    paused: video.paused,
  };
}

export function readOutputVideoElementCount(_unused?: void): number {
  return document.querySelectorAll("[data-gsc-output-stage] video").length;
}

export function readOutputPageNavigationCount(_unused?: void): number {
  return performance.getEntriesByType("navigation").length;
}

export function isOutputVideoPlaying(state: OutputVideoState | null): boolean {
  return state !== null && state.readyState >= 2 && !state.paused && state.currentTimeSec > 0;
}

export async function waitForOutputVideoPlaying(
  evaluate: <T, A>(fn: (arg: A) => T, arg: A) => Promise<T>,
  startedAtMs: number,
  timeoutMs = 20_000,
): Promise<number> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const state = await evaluate(readOutputVideoState, undefined);
    if (isOutputVideoPlaying(state)) {
      return Date.now() - startedAtMs;
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error("Timed out waiting for output video to start playing");
}

export async function expectOutputPlaybackStable(
  evaluate: <T, A>(fn: (arg: A) => T, arg: A) => Promise<T>,
  wait: (ms: number) => Promise<void>,
  options: { stableMs?: number; advanceMs?: number } = {},
): Promise<void> {
  const stableMs = options.stableMs ?? OUTPUT_STABLE_MS;
  const advanceMs = options.advanceMs ?? 500;
  const navigationCount = await evaluate(readOutputPageNavigationCount, undefined);

  const waitForVideoCount = async (count: number) => {
    const deadline = Date.now() + 10_000;
    while (Date.now() < deadline) {
      if ((await evaluate(readOutputVideoElementCount, undefined)) === count) return;
      await wait(200);
    }
    throw new Error(`Expected ${count} output video element(s)`);
  };

  await waitForVideoCount(1);

  const beforeStable = (await evaluate(readOutputVideoState, undefined))?.currentTimeSec ?? 0;
  await wait(stableMs);

  if ((await evaluate(readOutputPageNavigationCount, undefined)) !== navigationCount) {
    throw new Error("Output page reloaded during stable playback window");
  }
  await waitForVideoCount(1);

  const midStable = (await evaluate(readOutputVideoState, undefined))?.currentTimeSec ?? 0;
  if (midStable <= beforeStable) {
    throw new Error("Output video did not advance during stable window");
  }

  await wait(advanceMs);

  const afterStable = (await evaluate(readOutputVideoState, undefined))?.currentTimeSec ?? 0;
  if (afterStable <= midStable) {
    throw new Error("Output video stopped advancing after stable window");
  }
}

/** Playwright popup adapter — reuses shared output assertions. */
export async function expectOutputPlaybackStableOnPage(
  outputPage: Page,
  options?: { stableMs?: number; advanceMs?: number },
): Promise<void> {
  await expectOutputPlaybackStable(
    (fn, arg) => outputPage.evaluate(fn, arg),
    (ms) => outputPage.waitForTimeout(ms),
    options,
  );
}

export async function expectOutputVideoLoadsWithinOnPage(
  outputPage: Page,
  startedAtMs: number,
  maxMs = OUTPUT_VIDEO_LOAD_MAX_MS,
): Promise<number> {
  const loadMs = await waitForOutputVideoPlaying(
    (fn, arg) => outputPage.evaluate(fn, arg),
    startedAtMs,
  );
  if (loadMs > maxMs) {
    throw new Error(`Output video took ${loadMs}ms to start (limit ${maxMs}ms)`);
  }
  return loadMs;
}
