import { dropAudioOnCueList, openActiveCuesTab, pressTransportGo } from "../actions";
import type { AppDriver } from "../driver";
import { fixturePath } from "../fixtures";

export const DESKTOP_OUTPUT_VIDEO_FIXTURE = "test-video-playback.mp4";
/** Linux WebKit CI runners need more time for scratch-project disk sync + decode. */
export const DESKTOP_OUTPUT_VIDEO_LOAD_MAX_MS = 30_000;

export interface DesktopScratchOutputVideoDriver extends AppDriver {
  dismissStartupDialogIfPresent(): Promise<void>;
  expectActiveCueVisible(cueName: string): Promise<void>;
  openOutputWindow(): Promise<void>;
  switchToMainWindow(): Promise<void>;
  switchToOutputWindow(): Promise<void>;
  wait(ms: number): Promise<void>;
  waitForOutputVideoPlaying(startedAtMs: number, timeoutMs?: number): Promise<number>;
  expectOutputPlaybackStable(options?: { stableMs?: number; advanceMs?: number }): Promise<void>;
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
  await dropAudioOnCueList(driver, fixturePath(fileName), fileName, mimeType);
  await driver.expectCueInSequenceList(fileName);
  await driver.openOutputWindow();

  await openActiveCuesTab(driver);
  await driver.switchToMainWindow();
  await driver.waitForRole("button", "GO", { timeout: 15_000 });

  const goAtMs = Date.now();
  await pressTransportGo(driver);
  await driver.expectActiveCueVisible(fileName);

  await driver.switchToOutputWindow();
  const loadMs = await driver.waitForOutputVideoPlaying(
    goAtMs,
    DESKTOP_OUTPUT_VIDEO_LOAD_MAX_MS + 10_000,
  );
  if (loadMs > DESKTOP_OUTPUT_VIDEO_LOAD_MAX_MS) {
    throw new Error(
      `Output video element took ${loadMs}ms to appear (limit ${DESKTOP_OUTPUT_VIDEO_LOAD_MAX_MS}ms)`,
    );
  }

  await driver.expectOutputPlaybackStable();
}
