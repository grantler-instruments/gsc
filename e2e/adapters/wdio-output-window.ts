import {
  isOutputVideoPlaying,
  OUTPUT_STABLE_MS,
  OUTPUT_VIDEO_LOAD_MAX_MS,
  type OutputVideoState,
} from "../shared/output-window";

type WdioBrowser = WebdriverIO.Browser;

async function readOutputVideoStateFromElements(
  browser: WdioBrowser,
): Promise<OutputVideoState | null> {
  const videos = await browser.$$("[data-gsc-output-stage] video");
  if ((await videos.length) === 0) return null;

  const video = videos[0];
  const [currentTimeSec, readyState, paused] = await Promise.all([
    video.getProperty("currentTime"),
    video.getProperty("readyState"),
    video.getProperty("paused"),
  ]);

  return {
    currentTimeSec: Number(currentTimeSec),
    readyState: Number(readyState),
    paused: Boolean(paused),
  };
}

async function readOutputVideoElementCountFromElements(browser: WdioBrowser): Promise<number> {
  return (await browser.$$("[data-gsc-output-stage] video")).length;
}

export async function waitForOutputVideoPlayingViaElements(
  browser: WdioBrowser,
  startedAtMs: number,
  timeoutMs = OUTPUT_VIDEO_LOAD_MAX_MS + 5_000,
): Promise<number> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const state = await readOutputVideoStateFromElements(browser);
    if (isOutputVideoPlaying(state)) {
      return Date.now() - startedAtMs;
    }
    await browser.pause(200);
  }
  throw new Error("Timed out waiting for output video to start playing");
}

export async function expectOutputPlaybackStableViaElements(
  browser: WdioBrowser,
  options: { stableMs?: number; advanceMs?: number } = {},
): Promise<void> {
  const stableMs = options.stableMs ?? OUTPUT_STABLE_MS;
  const advanceMs = options.advanceMs ?? 500;
  const outputUrl = await browser.getUrl();

  const waitForVideoCount = async (count: number) => {
    const deadline = Date.now() + 10_000;
    while (Date.now() < deadline) {
      if ((await readOutputVideoElementCountFromElements(browser)) === count) return;
      await browser.pause(200);
    }
    throw new Error(`Expected ${count} output video element(s)`);
  };

  await waitForVideoCount(1);

  const beforeStable = (await readOutputVideoStateFromElements(browser))?.currentTimeSec ?? 0;
  await browser.pause(stableMs);

  if ((await browser.getUrl()) !== outputUrl) {
    throw new Error("Output page reloaded during stable playback window");
  }
  await waitForVideoCount(1);

  const midStable = (await readOutputVideoStateFromElements(browser))?.currentTimeSec ?? 0;
  if (midStable <= beforeStable) {
    throw new Error("Output video did not advance during stable window");
  }

  await browser.pause(advanceMs);

  const afterStable = (await readOutputVideoStateFromElements(browser))?.currentTimeSec ?? 0;
  if (afterStable <= midStable) {
    throw new Error("Output video stopped advancing after stable window");
  }
}
