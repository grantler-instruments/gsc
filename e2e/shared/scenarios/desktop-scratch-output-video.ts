import {
  dropAudioOnCueList,
  expectCueInSequenceList,
  openActiveCuesTab,
  pressTransportGo,
} from "../actions";
import type { AppDriver } from "../driver";
import { fixturePath } from "../fixtures";
import {
  expectOutputPlaybackStable,
  OUTPUT_VIDEO_LOAD_MAX_MS,
  waitForOutputVideoPlaying,
} from "../output-window";

export const DESKTOP_OUTPUT_VIDEO_FIXTURE = "test-video-playback.mp4";

export interface DesktopScratchOutputVideoDriver extends AppDriver {
  dismissStartupDialogIfPresent(): Promise<void>;
  openOutputWindow(): Promise<void>;
  switchToMainWindow(): Promise<void>;
  switchToOutputWindow(): Promise<void>;
  wait(ms: number): Promise<void>;
}

export interface DesktopScratchOutputVideoOptions {
  fileName?: string;
  mimeType?: string;
}

/**
 * Tauri desktop: fresh scratch project, open output window, GO, stable video playback.
 * Guards against the disk-mode blob repost / output reload regression.
 */
export async function desktopScratchOutputVideoPlays(
  driver: DesktopScratchOutputVideoDriver,
  options: DesktopScratchOutputVideoOptions = {},
): Promise<void> {
  const fileName = options.fileName ?? DESKTOP_OUTPUT_VIDEO_FIXTURE;
  const mimeType = options.mimeType ?? "video/mp4";

  await driver.gotoApp();
  await driver.dismissStartupDialogIfPresent();
  await dropAudioOnCueList(driver, fixturePath(fileName), fileName, mimeType);
  await expectCueInSequenceList(driver, fileName);
  await driver.openOutputWindow();

  await openActiveCuesTab(driver);
  await driver.switchToMainWindow();
  await driver.waitForRole("button", "GO", { timeout: 15_000 });

  const goAtMs = Date.now();
  await pressTransportGo(driver);

  await driver.switchToOutputWindow();
  const loadMs = await waitForOutputVideoPlaying(
    (fn, arg) => driver.evaluate(fn, arg),
    goAtMs,
    OUTPUT_VIDEO_LOAD_MAX_MS + 5_000,
  );
  if (loadMs > OUTPUT_VIDEO_LOAD_MAX_MS) {
    throw new Error(`Output video took ${loadMs}ms to start (limit ${OUTPUT_VIDEO_LOAD_MAX_MS}ms)`);
  }

  await expectOutputPlaybackStable(
    (fn, arg) => driver.evaluate(fn, arg),
    (ms) => driver.wait(ms),
  );
}
