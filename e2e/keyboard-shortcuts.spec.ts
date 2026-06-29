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
import { expectCueInSequenceList } from "./helpers/cue-list-panel";
import { dropAudioOnCueList, fixturePath } from "./helpers/drop-audio";

const FIXTURE = "white-noise-playback.wav";

test("Space triggers global GO", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("./");

  await expect(transportGoButton(page)).toBeVisible();

  await dropAudioOnCueList(page, fixturePath(FIXTURE), FIXTURE, "audio/wav");
  await expectCueInSequenceList(page, FIXTURE);
  await openActiveCuesTab(page);

  await expect(activeCuesEmptyMessage(page)).toBeVisible();

  await pressTransportGo(page);

  await expect(activeCuesPanel(page).getByRole("button", { name: "Stop all" })).toBeVisible();
  await expect(activeCueRow(page, FIXTURE)).toBeVisible();
});

test("Escape triggers panic", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("./");

  await expect(transportGoButton(page)).toBeVisible();

  await dropAudioOnCueList(page, fixturePath(FIXTURE), FIXTURE, "audio/wav");
  await expectCueInSequenceList(page, FIXTURE);
  await openActiveCuesTab(page);
  await pressTransportGo(page);

  await expect(activeCueRow(page, FIXTURE)).toBeVisible();

  await pressPanic(page);

  await expect(activeCuesEmptyMessage(page)).toBeVisible();
  await expect(activeCueRow(page, FIXTURE)).toHaveCount(0);
  await expect(activeCuesPanel(page).getByRole("button", { name: "Stop all" })).toHaveCount(0);
});
