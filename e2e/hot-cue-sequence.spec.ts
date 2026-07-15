import { expect, test } from "@playwright/test";
import {
  activeCueRow,
  openActiveCuesTab,
  pressTransportGo,
  transportGoButton,
} from "./helpers/active-cues";
import { addCueType } from "./helpers/add-cue";
import { gotoApp } from "./helpers/app";
import { dragCueIntoContainer, expandContainerCue } from "./helpers/container-cues";
import { containerCueRow, expectCueInSequenceList, sequenceCueRow } from "./helpers/cue-list-panel";
import { dropAudioOnCueList, fixturePath } from "./helpers/drop-audio";
import { copyContainerToHotPanel, hotCuePanel } from "./helpers/hot-cues";

test.describe.configure({ mode: "serial" });

const MAIN_AUDIO = "white-noise-playback.wav";
const SHORT_A = "white-noise-short-a.wav";
const SHORT_B = "white-noise-short-b.wav";
/** Short clip length from generate-audio-fixtures.mjs. */
const SHORT_CLIP_SEC = 0.5;
const STEP_ADVANCE_TIMEOUT_MS = 15_000 + SHORT_CLIP_SEC * 1000;

async function prepareHotSequenceFromMainList(
  page: import("@playwright/test").Page,
): Promise<void> {
  await dropAudioOnCueList(page, fixturePath(MAIN_AUDIO), MAIN_AUDIO, "audio/wav");
  await dropAudioOnCueList(page, fixturePath(SHORT_A), SHORT_A, "audio/wav");
  await dropAudioOnCueList(page, fixturePath(SHORT_B), SHORT_B, "audio/wav");
  await expectCueInSequenceList(page, MAIN_AUDIO);
  await expectCueInSequenceList(page, SHORT_A);
  await expectCueInSequenceList(page, SHORT_B);

  await addCueType(page, "Sequence");
  await dragCueIntoContainer(page, SHORT_A, "Sequence");
  await dragCueIntoContainer(page, SHORT_B, "Sequence");
  await expandContainerCue(page, "Sequence");

  await expect(
    containerCueRow(page, "Sequence").getByText(/2 cue\(s\) · sequential/),
  ).toBeVisible();

  await copyContainerToHotPanel(page, "Sequence");
}

test("hot sequence auto-advances while main audio keeps playing", async ({ page }) => {
  test.setTimeout(90_000);

  await gotoApp(page, { resetStorage: true });
  await prepareHotSequenceFromMainList(page);

  await sequenceCueRow(page, MAIN_AUDIO).click();
  await openActiveCuesTab(page);
  await expect(transportGoButton(page)).toBeEnabled();
  await pressTransportGo(page);
  await expect(activeCueRow(page, MAIN_AUDIO)).toBeVisible();

  await hotCuePanel(page).getByRole("button", { name: "GO" }).click();

  await expect(activeCueRow(page, MAIN_AUDIO)).toBeVisible();
  await expect(activeCueRow(page, SHORT_A)).toBeVisible({ timeout: 10_000 });

  await expect(activeCueRow(page, SHORT_A)).toBeHidden({ timeout: STEP_ADVANCE_TIMEOUT_MS });
  await expect(activeCueRow(page, SHORT_B)).toBeVisible({ timeout: STEP_ADVANCE_TIMEOUT_MS });
  await expect(activeCueRow(page, MAIN_AUDIO)).toBeVisible();
});
