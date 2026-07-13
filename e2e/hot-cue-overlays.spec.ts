import { expect, test } from "@playwright/test";
import { activeCueRow, openActiveCuesTab, transportGoButton } from "./helpers/active-cues";
import { gotoApp } from "./helpers/app";
import { expectCueInSequenceList, sequenceCueRow } from "./helpers/cue-list-panel";
import { dropAudioFile, dropAudioOnCueList, fixturePath } from "./helpers/drop-audio";
import { hotCuePanel } from "./helpers/hot-cues";

test.describe.configure({ mode: "serial" });

const MAIN_AUDIO = "white-noise-playback.wav";
const HOT_VIDEO = "test-video-playback.mp4";

test("hot video cue stacks on playing main audio", async ({ page }) => {
  test.setTimeout(60_000);

  await gotoApp(page, { resetStorage: true });

  await dropAudioOnCueList(page, fixturePath(MAIN_AUDIO), MAIN_AUDIO, "audio/wav");
  await expectCueInSequenceList(page, MAIN_AUDIO);
  await sequenceCueRow(page, MAIN_AUDIO).click();

  await dropAudioFile(page, {
    fixturePath: fixturePath(HOT_VIDEO),
    fileName: HOT_VIDEO,
    mimeType: "video/mp4",
    target: "hot-cue-panel",
  });
  await expect(hotCuePanel(page)).toContainText(HOT_VIDEO);

  await sequenceCueRow(page, MAIN_AUDIO).click();
  await openActiveCuesTab(page);
  await transportGoButton(page).click();
  await expect(activeCueRow(page, MAIN_AUDIO)).toBeVisible();

  await hotCuePanel(page).getByRole("button", { name: "GO" }).first().click();

  await expect(activeCueRow(page, MAIN_AUDIO)).toBeVisible();
  await expect(activeCueRow(page, HOT_VIDEO)).toBeVisible();
});
