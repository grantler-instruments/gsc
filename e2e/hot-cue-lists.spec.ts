import { expect, test } from "@playwright/test";
import { activeCueRow, openActiveCuesTab, transportGoButton } from "./helpers/active-cues";
import { gotoApp } from "./helpers/app";
import { expectCueInSequenceList, sequenceCueRow } from "./helpers/cue-list-panel";
import {
  appendAudioOnHotCuePanel,
  dropAudioOnCueList,
  dropAudioOnHotCuePanel,
  fixturePath,
} from "./helpers/drop-audio";
import {
  addHotCueList,
  dragHotCuePadAfter,
  hotCueListTabs,
  hotCueNamesInOrder,
  hotCuePanel,
} from "./helpers/hot-cues";

test.describe.configure({ mode: "serial" });

const MAIN_AUDIO = "white-noise-playback.wav";
const HOT_A = "white-noise-short-a.wav";
const HOT_B = "white-noise-short-b.wav";

test("second hot list tab keeps its own cues when firing", async ({ page }) => {
  test.setTimeout(60_000);

  await gotoApp(page, { resetStorage: true });

  await dropAudioOnCueList(page, fixturePath(MAIN_AUDIO), MAIN_AUDIO, "audio/wav");
  await expectCueInSequenceList(page, MAIN_AUDIO);
  await sequenceCueRow(page, MAIN_AUDIO).click();

  await dropAudioOnHotCuePanel(page, fixturePath(HOT_A), HOT_A, "audio/wav");
  await expect(hotCuePanel(page)).toContainText(HOT_A);

  await addHotCueList(page);
  const hotTabs = hotCueListTabs(page).getByRole("tab");
  await expect(hotTabs).toHaveCount(2);
  await expect(hotTabs.nth(1)).toHaveAttribute("aria-selected", "true");

  await dropAudioOnHotCuePanel(page, fixturePath(HOT_B), HOT_B, "audio/wav");
  await expect(hotCuePanel(page)).toContainText(HOT_B);
  await expect(hotCuePanel(page).getByText(HOT_A, { exact: true })).toHaveCount(0);

  await sequenceCueRow(page, MAIN_AUDIO).click();
  await openActiveCuesTab(page);
  await transportGoButton(page).click();
  await expect(activeCueRow(page, MAIN_AUDIO)).toBeVisible();

  await hotCuePanel(page).getByRole("button", { name: "GO" }).click();
  await expect(activeCueRow(page, HOT_B)).toBeVisible();

  await hotCueListTabs(page).getByRole("tab").first().click();
  await expect(hotCueListTabs(page).getByRole("tab").first()).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await expect(hotCuePanel(page).getByText(HOT_A, { exact: true })).toHaveCount(1);
  await hotCuePanel(page).getByRole("button", { name: "GO" }).click();

  await expect(activeCueRow(page, MAIN_AUDIO)).toBeVisible();
  await expect(activeCueRow(page, HOT_A)).toBeVisible();
  await expect(activeCueRow(page, HOT_B)).toBeVisible();
});

test("reorders hot-cue pads within a list", async ({ page }) => {
  test.setTimeout(60_000);

  await gotoApp(page, { resetStorage: true });

  await dropAudioOnHotCuePanel(page, fixturePath(HOT_A), HOT_A, "audio/wav");
  await appendAudioOnHotCuePanel(page, fixturePath(HOT_B), HOT_B, "audio/wav");

  await expect.poll(() => hotCueNamesInOrder(page)).toEqual([HOT_A, HOT_B]);

  await dragHotCuePadAfter(page, HOT_A, HOT_B);

  await expect.poll(() => hotCueNamesInOrder(page)).toEqual([HOT_B, HOT_A]);
});
