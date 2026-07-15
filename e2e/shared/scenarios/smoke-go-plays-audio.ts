import {
  dropAudioOnCueList,
  expectActiveCueVisible,
  expectCueInSequenceList,
  expectPlaybackProgressToAdvance,
  openActiveCuesTab,
  pressTransportGo,
} from "../actions";
import type { AppDriver } from "../driver";
import { fixturePath } from "../fixtures";

export interface SmokeGoPlaysAudioOptions {
  fileName: string;
  mimeType: string;
  resetStorage?: boolean;
}

/** Drop audio, GO, and verify active-cue progress advances. */
export async function smokeGoPlaysAudio(
  driver: AppDriver,
  options: SmokeGoPlaysAudioOptions,
): Promise<void> {
  const { fileName, mimeType, resetStorage } = options;

  await driver.gotoApp({ resetStorage });
  await dropAudioOnCueList(driver, fixturePath(fileName), fileName, mimeType);
  await expectCueInSequenceList(driver, fileName);
  await openActiveCuesTab(driver);
  await pressTransportGo(driver);

  await driver.waitForRole("button", "Stop all");
  await expectActiveCueVisible(driver, fileName);
  await expectPlaybackProgressToAdvance(driver, fileName);
}
