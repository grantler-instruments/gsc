import { expect, test } from "@playwright/test";
import { activeCueRow, transportGoButton } from "./helpers/active-cues";
import { gotoApp } from "./helpers/app";
import { toggleShowMode } from "./helpers/cue-editing";
import { expectCueInSequenceList, sequenceCueRow } from "./helpers/cue-list-panel";
import { dropAudioOnCueList, dropAudioOnHotCuePanel, fixturePath } from "./helpers/drop-audio";
import { hotCuePanel } from "./helpers/hot-cues";
import { waitForAppReady, waitForAutosavedCue } from "./helpers/project-session";

test.describe.configure({ mode: "serial" });

const MAIN_AUDIO = "white-noise-playback.wav";
const HOT_AUDIO = "white-noise-playback.flac";

test("show mode hides hot-cue editing but still allows firing", async ({ page }) => {
  test.setTimeout(60_000);

  await gotoApp(page, { resetStorage: true });
  await expect(transportGoButton(page)).toBeVisible();

  await dropAudioOnCueList(page, fixturePath(MAIN_AUDIO), MAIN_AUDIO, "audio/wav");
  await expectCueInSequenceList(page, MAIN_AUDIO);
  await sequenceCueRow(page, MAIN_AUDIO).click();

  await dropAudioOnHotCuePanel(page, fixturePath(HOT_AUDIO), HOT_AUDIO, "audio/flac");
  await expect(hotCuePanel(page)).toContainText(HOT_AUDIO);

  await toggleShowMode(page);
  await expect(page.getByRole("button", { name: /Show mode/i })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(hotCuePanel(page).getByRole("button", { name: "+ Cue ▾" })).toHaveCount(0);

  await sequenceCueRow(page, MAIN_AUDIO).click();
  await transportGoButton(page).click();
  await hotCuePanel(page).getByRole("button", { name: "GO" }).first().click();

  await expect(activeCueRow(page, MAIN_AUDIO)).toBeVisible();
  await expect(activeCueRow(page, HOT_AUDIO)).toBeVisible();
});

test("show mode blocks dropping new assets onto the hot-cue panel", async ({ page }) => {
  test.setTimeout(60_000);

  await gotoApp(page, { resetStorage: true });
  await dropAudioOnHotCuePanel(page, fixturePath(HOT_AUDIO), HOT_AUDIO, "audio/flac");
  await expect(hotCuePanel(page).getByText(HOT_AUDIO, { exact: true })).toHaveCount(1);

  await toggleShowMode(page);
  await expect(page.getByRole("button", { name: /Show mode/i })).toHaveAttribute(
    "aria-pressed",
    "true",
  );

  await dropAudioOnHotCuePanel(page, fixturePath(MAIN_AUDIO), MAIN_AUDIO, "audio/wav");
  await expect(hotCuePanel(page).getByText(HOT_AUDIO, { exact: true })).toHaveCount(1);
  await expect(hotCuePanel(page).getByText(MAIN_AUDIO, { exact: true })).toHaveCount(0);
});

test("reload restores hot cues and they still stack on main playback", async ({ page }) => {
  test.setTimeout(90_000);

  await gotoApp(page, { resetStorage: true });

  await dropAudioOnCueList(page, fixturePath(MAIN_AUDIO), MAIN_AUDIO, "audio/wav");
  await expectCueInSequenceList(page, MAIN_AUDIO);
  await sequenceCueRow(page, MAIN_AUDIO).click();

  await dropAudioOnHotCuePanel(page, fixturePath(HOT_AUDIO), HOT_AUDIO, "audio/flac");
  await expect(hotCuePanel(page)).toContainText(HOT_AUDIO);

  await waitForAutosavedCue(page, MAIN_AUDIO);
  await waitForAutosavedCue(page, HOT_AUDIO);

  await page.reload();
  await waitForAppReady(page);
  await expect(transportGoButton(page)).toBeVisible();

  await expectCueInSequenceList(page, MAIN_AUDIO);
  await expect(hotCuePanel(page)).toContainText(HOT_AUDIO);

  await sequenceCueRow(page, MAIN_AUDIO).click();
  await transportGoButton(page).click();
  await hotCuePanel(page).getByRole("button", { name: "GO" }).first().click();

  await expect(activeCueRow(page, MAIN_AUDIO)).toBeVisible();
  await expect(activeCueRow(page, HOT_AUDIO)).toBeVisible();
});
