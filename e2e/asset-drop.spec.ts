import { expect, test } from "@playwright/test";
import { IMPORT_AUDIO_FIXTURES } from "./fixtures/playback-formats.mjs";
import { expectCueInSequenceList, sequenceCueListPanel } from "./helpers/cue-list-panel";
import { dropAudioOnCueList, fixturePath } from "./helpers/drop-audio";

for (const { fileName, mimeType } of IMPORT_AUDIO_FIXTURES) {
  test(`dropping ${fileName} onto the cue list creates an audio cue and asset`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("./");

    await expect(page.getByRole("button", { name: "GO" })).toBeVisible();

    const assetsPanel = page.locator('[data-gsc-drop-zone="assets"]');

    await dropAudioOnCueList(page, fixturePath(fileName), fileName, mimeType);
    await expectCueInSequenceList(page, fileName);

    await expect(assetsPanel.getByText(fileName, { exact: true })).toBeVisible();

    const mainCueList = sequenceCueListPanel(page).locator('[data-gsc-drop-zone="cue-list"]');
    const cue = mainCueList.locator("[data-cue-id]").filter({ hasText: fileName });
    await expect(cue).toBeVisible();
    await expect(cue).toHaveCount(1);
  });
}
