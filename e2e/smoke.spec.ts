import { expect, test } from "@playwright/test";
import {
  activeCueRow,
  activeCuesEmptyMessage,
  activeCuesPanel,
  expectPlaybackProgressToAdvance,
  openActiveCuesTab,
  pressPanic,
  pressTransportGo,
  transportGoButton,
} from "./helpers/active-cues";
import { gotoApp } from "./helpers/app";
import {
  expectCueInSequenceList,
  sequenceCueListPanel,
  sequenceCueListTabs,
} from "./helpers/cue-list-panel";
import { dropAudioOnCueList, fixturePath } from "./helpers/drop-audio";
import {
  renameShow,
  showNameButton,
  waitForAutosavedCue,
  waitForAutosavedShowName,
} from "./helpers/project-session";

const FIXTURE = "white-noise-playback.wav";
const RECOVERED_SHOW_NAME = "Recovered Show";
const RECOVERED_LIST_NAME = "Act 2";
const RECOVERED_AUDIO = "white-noise-playback.wav";

test("drop WAV creates cue and asset @smoke", async ({ page }) => {
  await gotoApp(page);

  const assetsPanel = page.locator('[data-gsc-drop-zone="assets"]');
  await dropAudioOnCueList(page, fixturePath(FIXTURE), FIXTURE, "audio/wav");
  await expectCueInSequenceList(page, FIXTURE);
  await expect(assetsPanel.getByText(FIXTURE, { exact: true })).toBeVisible();
});

test("GO plays audio with advancing progress @smoke", async ({ page }) => {
  test.setTimeout(60_000);

  await gotoApp(page);
  await dropAudioOnCueList(page, fixturePath(FIXTURE), FIXTURE, "audio/wav");
  await expectCueInSequenceList(page, FIXTURE);
  await openActiveCuesTab(page);
  await pressTransportGo(page);

  await expect(activeCuesPanel(page).getByRole("button", { name: "Stop all" })).toBeVisible();
  await expect(activeCueRow(page, FIXTURE)).toBeVisible();
  await expectPlaybackProgressToAdvance(page, FIXTURE);
});

test("Space GO and Escape panic @smoke", async ({ page }) => {
  await gotoApp(page);

  await dropAudioOnCueList(page, fixturePath(FIXTURE), FIXTURE, "audio/wav");
  await expectCueInSequenceList(page, FIXTURE);
  await openActiveCuesTab(page);
  await expect(activeCuesEmptyMessage(page)).toBeVisible();

  await pressTransportGo(page);
  await expect(activeCueRow(page, FIXTURE)).toBeVisible();

  await pressPanic(page);
  await expect(activeCuesEmptyMessage(page)).toBeVisible();
  await expect(activeCueRow(page, FIXTURE)).toHaveCount(0);
});

test("reload restores autosaved project @smoke", async ({ page }) => {
  test.setTimeout(90_000);

  await gotoApp(page);
  await renameShow(page, RECOVERED_SHOW_NAME);

  const tablist = sequenceCueListTabs(page);
  await sequenceCueListPanel(page).getByRole("button", { name: "New cue list" }).click();
  const newListTab = tablist.getByRole("tab").last();
  await newListTab.dblclick();
  const renameInput = tablist.locator("input");
  await renameInput.fill(RECOVERED_LIST_NAME);
  await renameInput.press("Enter");

  await dropAudioOnCueList(page, fixturePath(RECOVERED_AUDIO), RECOVERED_AUDIO, "audio/wav");
  await expectCueInSequenceList(page, RECOVERED_AUDIO);
  await waitForAutosavedShowName(page, RECOVERED_SHOW_NAME);
  await waitForAutosavedCue(page, RECOVERED_AUDIO);

  await page.reload();
  await expect(transportGoButton(page)).toBeVisible({ timeout: 30_000 });

  await expect(showNameButton(page)).toHaveText(RECOVERED_SHOW_NAME);
  await expect(
    tablist.getByRole("tab", { name: new RegExp(`^${RECOVERED_LIST_NAME}`) }),
  ).toBeVisible();
  await expectCueInSequenceList(page, RECOVERED_AUDIO);
});

test("create and rename cue list @smoke", async ({ page }) => {
  await gotoApp(page);

  const tablist = sequenceCueListTabs(page);
  await sequenceCueListPanel(page).getByRole("button", { name: "New cue list" }).click();
  await expect(tablist.getByRole("tab")).toHaveCount(2);

  await tablist.getByRole("tab", { name: /^Main/ }).dblclick();
  const renameInput = tablist.locator("input");
  await renameInput.fill("Act 1");
  await renameInput.press("Enter");
  await expect(tablist.getByRole("tab", { name: /^Act 1/ })).toBeVisible();
});
