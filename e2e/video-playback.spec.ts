import { expect, test } from "@playwright/test";
import { PLAYBACK_VIDEO_FIXTURES } from "./fixtures/playback-formats.mjs";

test.describe.configure({ mode: "serial" });

import {
  activeCueRow,
  activeCuesPanel,
  expectPlaybackProgressToAdvance,
  openActiveCuesTab,
  pressTransportGo,
  transportGoButton,
} from "./helpers/active-cues";
import { expectCueInSequenceList } from "./helpers/cue-list-panel";
import { dropAudioOnCueList, fixturePath } from "./helpers/drop-audio";

for (const { fileName, mimeType } of PLAYBACK_VIDEO_FIXTURES) {
  test(`playing ${fileName} shows progress in Active cues`, async ({ page }) => {
    test.setTimeout(60_000);

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("./");

    await expect(transportGoButton(page)).toBeVisible();

    await dropAudioOnCueList(page, fixturePath(fileName), fileName, mimeType);
    await expectCueInSequenceList(page, fileName);
    await openActiveCuesTab(page);
    await expect(transportGoButton(page)).toBeEnabled();
    await pressTransportGo(page);

    await expect(activeCuesPanel(page).getByRole("button", { name: "Stop all" })).toBeVisible();
    await expect(activeCueRow(page, fileName)).toBeVisible();
    await expect(activeCueRow(page, fileName).getByRole("button", { name: "Stop" })).toBeVisible();

    await expectPlaybackProgressToAdvance(page, fileName);
  });
}
