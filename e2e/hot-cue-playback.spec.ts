import { expect, test } from "@playwright/test";
import {
  activeCueRow,
  activeCuesEmptyMessage,
  activeCuesPanel,
  openActiveCuesTab,
  pressPanic,
  pressTransportGo,
  transportGoButton,
} from "./helpers/active-cues";
import { gotoApp } from "./helpers/app";
import { expectCueInSequenceList, sequenceCueRow } from "./helpers/cue-list-panel";
import {
  appendAudioOnHotCuePanel,
  dropAudioOnCueList,
  dropAudioOnHotCuePad,
  dropAudioOnHotCuePanel,
  fixturePath,
} from "./helpers/drop-audio";
import { expectHotCuePadActive, hotCuePadSurfaceBackground, hotCuePanel } from "./helpers/hot-cues";

test.describe.configure({ mode: "serial" });

const MAIN_AUDIO = "white-noise-playback.wav";
const HOT_AUDIO = "white-noise-short-b.wav";
const HOT_AUDIO_2 = "white-noise-short-a.wav";
const HOT_AUDIO_LONG = "white-noise-playback.flac";

async function startMainAndHotAudio(
  page: import("@playwright/test").Page,
  hotAudio = HOT_AUDIO,
): Promise<void> {
  await dropAudioOnCueList(page, fixturePath(MAIN_AUDIO), MAIN_AUDIO, "audio/wav");
  await expectCueInSequenceList(page, MAIN_AUDIO);
  await sequenceCueRow(page, MAIN_AUDIO).click();

  await dropAudioOnHotCuePanel(
    page,
    fixturePath(hotAudio),
    hotAudio,
    hotAudio.endsWith(".flac") ? "audio/flac" : "audio/wav",
  );
  await sequenceCueRow(page, MAIN_AUDIO).click();
  await openActiveCuesTab(page);

  await expect(transportGoButton(page)).toBeEnabled();
  await transportGoButton(page).click();

  const hotCuePanel = page.getByRole("complementary", { name: "Hot cues" });
  await hotCuePanel.getByRole("button", { name: "GO" }).first().click();

  await expect(activeCueRow(page, MAIN_AUDIO)).toBeVisible();
  await expect(activeCueRow(page, hotAudio)).toBeVisible();
}

test("hot cue audio stacks on top of playing main audio", async ({ page }) => {
  test.setTimeout(60_000);

  await gotoApp(page, { resetStorage: true });
  await expect(transportGoButton(page)).toBeVisible();

  await dropAudioOnCueList(page, fixturePath(MAIN_AUDIO), MAIN_AUDIO, "audio/wav");
  await expectCueInSequenceList(page, MAIN_AUDIO);
  await sequenceCueRow(page, MAIN_AUDIO).click();

  await dropAudioOnHotCuePanel(page, fixturePath(HOT_AUDIO), HOT_AUDIO, "audio/wav");
  await expect(page.getByRole("complementary", { name: "Hot cues" })).toContainText(HOT_AUDIO);
  // Dropping onto the hot-cue panel focuses the hot list; return focus to the main list
  // so the footer transport GO triggers the selected main cue.
  await sequenceCueRow(page, MAIN_AUDIO).click();

  await openActiveCuesTab(page);
  await expect(transportGoButton(page)).toBeEnabled();
  await transportGoButton(page).click();
  await expect(activeCueRow(page, MAIN_AUDIO)).toBeVisible();

  const hotCuePanel = page.getByRole("complementary", { name: "Hot cues" });
  await hotCuePanel.getByRole("button", { name: "GO" }).first().click();

  await expect(activeCueRow(page, HOT_AUDIO)).toBeVisible();
  await expect(activeCueRow(page, MAIN_AUDIO)).toBeVisible();
});

test("panic stops both main and hot-cue audio", async ({ page }) => {
  test.setTimeout(60_000);

  await gotoApp(page, { resetStorage: true });
  await expect(transportGoButton(page)).toBeVisible();

  await dropAudioOnCueList(page, fixturePath(MAIN_AUDIO), MAIN_AUDIO, "audio/wav");
  await expectCueInSequenceList(page, MAIN_AUDIO);
  await sequenceCueRow(page, MAIN_AUDIO).click();

  await dropAudioOnHotCuePanel(page, fixturePath(HOT_AUDIO), HOT_AUDIO, "audio/wav");
  await sequenceCueRow(page, MAIN_AUDIO).click();
  await openActiveCuesTab(page);

  await expect(transportGoButton(page)).toBeEnabled();
  await transportGoButton(page).click();
  const hotCuePanel = page.getByRole("complementary", { name: "Hot cues" });
  await hotCuePanel.getByRole("button", { name: "GO" }).first().click();

  await expect(activeCueRow(page, MAIN_AUDIO)).toBeVisible();
  await expect(activeCueRow(page, HOT_AUDIO)).toBeVisible();

  await pressPanic(page);
  await expect(activeCuesEmptyMessage(page)).toBeVisible();
  await expect(activeCueRow(page, MAIN_AUDIO)).toHaveCount(0);
  await expect(activeCueRow(page, HOT_AUDIO)).toHaveCount(0);
  await expect(activeCuesPanel(page).getByRole("button", { name: "Stop all" })).toHaveCount(0);
});

test("Stop all stops both main and hot-cue audio", async ({ page }) => {
  test.setTimeout(60_000);

  await gotoApp(page, { resetStorage: true });
  await expect(transportGoButton(page)).toBeVisible();

  await dropAudioOnCueList(page, fixturePath(MAIN_AUDIO), MAIN_AUDIO, "audio/wav");
  await expectCueInSequenceList(page, MAIN_AUDIO);
  await sequenceCueRow(page, MAIN_AUDIO).click();

  await dropAudioOnHotCuePanel(page, fixturePath(HOT_AUDIO), HOT_AUDIO, "audio/wav");
  await sequenceCueRow(page, MAIN_AUDIO).click();
  await openActiveCuesTab(page);

  await expect(transportGoButton(page)).toBeEnabled();
  await transportGoButton(page).click();
  const hotCuePanel = page.getByRole("complementary", { name: "Hot cues" });
  await hotCuePanel.getByRole("button", { name: "GO" }).first().click();

  await expect(activeCueRow(page, MAIN_AUDIO)).toBeVisible();
  await expect(activeCueRow(page, HOT_AUDIO)).toBeVisible();

  await activeCuesPanel(page).getByRole("button", { name: "Stop all" }).click();
  await expect(activeCuesEmptyMessage(page)).toBeVisible();
  await expect(activeCueRow(page, MAIN_AUDIO)).toHaveCount(0);
  await expect(activeCueRow(page, HOT_AUDIO)).toHaveCount(0);
});

test("stopping main audio leaves hot-cue audio playing", async ({ page }) => {
  test.setTimeout(60_000);

  await gotoApp(page, { resetStorage: true });
  await expect(transportGoButton(page)).toBeVisible();
  await startMainAndHotAudio(page, HOT_AUDIO_LONG);

  await activeCueRow(page, MAIN_AUDIO).getByRole("button", { name: "Stop" }).click();

  await expect(activeCueRow(page, MAIN_AUDIO)).toHaveCount(0);
  await expect(activeCueRow(page, HOT_AUDIO_LONG)).toBeVisible();
  await expect(activeCuesPanel(page).getByRole("button", { name: "Stop all" })).toBeVisible();
});

test("Space fires selected hot cue while main audio is playing", async ({ page }) => {
  test.setTimeout(60_000);

  await gotoApp(page, { resetStorage: true });
  await expect(transportGoButton(page)).toBeVisible();

  await dropAudioOnCueList(page, fixturePath(MAIN_AUDIO), MAIN_AUDIO, "audio/wav");
  await expectCueInSequenceList(page, MAIN_AUDIO);
  await sequenceCueRow(page, MAIN_AUDIO).click();

  await dropAudioOnHotCuePanel(page, fixturePath(HOT_AUDIO), HOT_AUDIO, "audio/wav");
  await sequenceCueRow(page, MAIN_AUDIO).click();
  await openActiveCuesTab(page);

  await expect(transportGoButton(page)).toBeEnabled();
  await transportGoButton(page).click();
  await expect(activeCueRow(page, MAIN_AUDIO)).toBeVisible();

  const hotCuePanel = page.getByRole("complementary", { name: "Hot cues" });
  await hotCuePanel.getByText(HOT_AUDIO, { exact: true }).click();
  await pressTransportGo(page);

  await expect(activeCueRow(page, HOT_AUDIO)).toBeVisible();
  await expect(activeCueRow(page, MAIN_AUDIO)).toBeVisible();
  await expect(sequenceCueRow(page, MAIN_AUDIO)).toBeVisible();
});

test("stopping hot-cue audio leaves main audio playing", async ({ page }) => {
  test.setTimeout(60_000);

  await gotoApp(page, { resetStorage: true });
  await expect(transportGoButton(page)).toBeVisible();
  await startMainAndHotAudio(page, HOT_AUDIO_LONG);

  await activeCueRow(page, HOT_AUDIO_LONG).getByRole("button", { name: "Stop" }).click();

  await expect(activeCueRow(page, HOT_AUDIO_LONG)).toHaveCount(0);
  await expect(activeCueRow(page, MAIN_AUDIO)).toBeVisible();
  await expect(activeCuesPanel(page).getByRole("button", { name: "Stop all" })).toBeVisible();
});

test("two hot cues stack on top of playing main audio", async ({ page }) => {
  test.setTimeout(60_000);

  await gotoApp(page, { resetStorage: true });
  await expect(transportGoButton(page)).toBeVisible();

  await dropAudioOnCueList(page, fixturePath(MAIN_AUDIO), MAIN_AUDIO, "audio/wav");
  await expectCueInSequenceList(page, MAIN_AUDIO);
  await sequenceCueRow(page, MAIN_AUDIO).click();

  await dropAudioOnHotCuePanel(page, fixturePath(HOT_AUDIO_LONG), HOT_AUDIO_LONG, "audio/flac");
  await appendAudioOnHotCuePanel(page, fixturePath(HOT_AUDIO_2), HOT_AUDIO_2, "audio/wav");
  await sequenceCueRow(page, MAIN_AUDIO).click();
  await openActiveCuesTab(page);

  await expect(transportGoButton(page)).toBeEnabled();
  await transportGoButton(page).click();
  await expect(activeCueRow(page, MAIN_AUDIO)).toBeVisible();

  const hotCuePanel = page.getByRole("complementary", { name: "Hot cues" });
  const hotGoButtons = hotCuePanel.getByRole("button", { name: "GO" });
  await hotGoButtons.nth(0).click();
  await hotGoButtons.nth(1).click();

  await expect(activeCueRow(page, HOT_AUDIO_LONG)).toBeVisible();
  await expect(activeCueRow(page, HOT_AUDIO_2)).toBeVisible();
  await expect(activeCueRow(page, MAIN_AUDIO)).toBeVisible();
});

test("re-firing a hot cue keeps main audio playing", async ({ page }) => {
  test.setTimeout(60_000);

  await gotoApp(page, { resetStorage: true });
  await expect(transportGoButton(page)).toBeVisible();
  await startMainAndHotAudio(page, HOT_AUDIO_LONG);

  const hotCuePanel = page.getByRole("complementary", { name: "Hot cues" });
  await hotCuePanel.getByRole("button", { name: "GO" }).first().click();

  await expect(activeCueRow(page, MAIN_AUDIO)).toBeVisible();
  await expect(activeCueRow(page, HOT_AUDIO_LONG)).toBeVisible();
});

test("hot cue pad highlights while its cue is active", async ({ page }) => {
  test.setTimeout(60_000);

  await gotoApp(page, { resetStorage: true });

  await dropAudioOnHotCuePanel(page, fixturePath(HOT_AUDIO_LONG), HOT_AUDIO_LONG, "audio/flac");
  await appendAudioOnHotCuePanel(page, fixturePath(HOT_AUDIO_2), HOT_AUDIO_2, "audio/wav");
  const inactiveBackground = await hotCuePadSurfaceBackground(page, HOT_AUDIO_2);

  await openActiveCuesTab(page);
  await hotCuePanel(page).getByRole("button", { name: "GO" }).first().click();
  await expect(activeCueRow(page, HOT_AUDIO_LONG)).toBeVisible();

  const activeBackground = await hotCuePadSurfaceBackground(page, HOT_AUDIO_LONG);
  expect(activeBackground).not.toBe(inactiveBackground);
  await expectHotCuePadActive(page, HOT_AUDIO_LONG);
});

test("dropping audio onto a specific hot cue pad updates that pad", async ({ page }) => {
  test.setTimeout(60_000);

  await gotoApp(page, { resetStorage: true });

  await dropAudioOnHotCuePanel(page, fixturePath(HOT_AUDIO), HOT_AUDIO, "audio/wav");
  await expect(hotCuePanel(page).getByText(HOT_AUDIO, { exact: true })).toBeVisible();

  await dropAudioOnHotCuePad(
    page,
    HOT_AUDIO,
    fixturePath(HOT_AUDIO_LONG),
    HOT_AUDIO_LONG,
    "audio/flac",
  );

  await expect(hotCuePanel(page).getByText(HOT_AUDIO_LONG, { exact: true })).toBeVisible();
  await expect(hotCuePanel(page).getByText(HOT_AUDIO, { exact: true })).toHaveCount(0);
  await expect(hotCuePanel(page).getByRole("button", { name: "GO" })).toHaveCount(1);
});
