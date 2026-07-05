import { expect, test } from "@playwright/test";
import {
  activeCueRow,
  activeCuesEmptyMessage,
  openActiveCuesTab,
  pressTransportGo,
} from "./helpers/active-cues";
import { addCueType } from "./helpers/add-cue";
import { gotoApp } from "./helpers/app";
import { dragCueIntoContainer, expandContainerCue } from "./helpers/container-cues";
import {
  containerCueRow,
  expectCueInSequenceList,
  sequenceCueList,
  sequenceCueRow,
} from "./helpers/cue-list-panel";
import { dropAudioOnCueList, fixturePath } from "./helpers/drop-audio";
import { prefetchClipDurations } from "./helpers/sequence";

const SHORT_A = "white-noise-short-a.wav";
const SHORT_B = "white-noise-short-b.wav";
/** Short clip length from generate-audio-fixtures.mjs. */
const SHORT_CLIP_SEC = 0.5;
const STEP_ADVANCE_TIMEOUT_MS = 15_000 + SHORT_CLIP_SEC * 1000;

test.describe.configure({ mode: "serial" });

async function prepareTwoStepSequence(page: import("@playwright/test").Page): Promise<void> {
  await gotoApp(page);

  await dropAudioOnCueList(page, fixturePath(SHORT_A), SHORT_A, "audio/wav");
  await dropAudioOnCueList(page, fixturePath(SHORT_B), SHORT_B, "audio/wav");
  await expectCueInSequenceList(page, SHORT_A);
  await expectCueInSequenceList(page, SHORT_B);

  await addCueType(page, "Sequence");
  await expect(containerCueRow(page, "Sequence")).toHaveCount(1);

  await dragCueIntoContainer(page, SHORT_A, "Sequence");
  await dragCueIntoContainer(page, SHORT_B, "Sequence");
  await expandContainerCue(page, "Sequence");

  await expect(sequenceCueRow(page, SHORT_A)).toHaveCount(1);
  await expect(sequenceCueRow(page, SHORT_B)).toHaveCount(1);
  await expect(
    containerCueRow(page, "Sequence").getByText(/2 cue\(s\) · sequential/),
  ).toBeVisible();
}

test("sequence auto-advances through two audio steps @smoke @structure", async ({ page }) => {
  test.setTimeout(60_000);

  await prepareTwoStepSequence(page);
  await prefetchClipDurations(page, [SHORT_A, SHORT_B]);
  await containerCueRow(page, "Sequence").click();
  await openActiveCuesTab(page);

  await pressTransportGo(page);

  await expect(activeCueRow(page, SHORT_A)).toBeVisible({ timeout: 10_000 });
  await expect(containerCueRow(page, "Sequence").getByText("Playing step 1 of 2")).toBeVisible({
    timeout: STEP_ADVANCE_TIMEOUT_MS,
  });

  await expect(activeCueRow(page, SHORT_A)).toBeHidden({ timeout: STEP_ADVANCE_TIMEOUT_MS });

  await expect
    .poll(
      async () => {
        if (await activeCueRow(page, SHORT_B).isVisible()) return "active";
        if (await containerCueRow(page, "Sequence").getByText("Playing step 2 of 2").isVisible()) {
          return "step";
        }
        return "";
      },
      { timeout: STEP_ADVANCE_TIMEOUT_MS },
    )
    .not.toBe("");

  await expect(activeCueRow(page, SHORT_B)).toBeVisible({ timeout: STEP_ADVANCE_TIMEOUT_MS });
  await expect(containerCueRow(page, "Sequence").getByText("Playing step 2 of 2")).toBeVisible({
    timeout: STEP_ADVANCE_TIMEOUT_MS,
  });

  await expect(activeCueRow(page, SHORT_B)).toBeHidden({ timeout: STEP_ADVANCE_TIMEOUT_MS });
  await expect(activeCuesEmptyMessage(page)).toBeVisible({ timeout: 10_000 });
});

test("wait cue delays next sequence step @structure", async ({ page }) => {
  test.setTimeout(60_000);

  await gotoApp(page);

  await dropAudioOnCueList(page, fixturePath(SHORT_A), SHORT_A, "audio/wav");
  await dropAudioOnCueList(page, fixturePath(SHORT_B), SHORT_B, "audio/wav");

  await addCueType(page, "Sequence");
  await dragCueIntoContainer(page, SHORT_A, "Sequence");

  await containerCueRow(page, "Sequence").click();
  await page.getByRole("button", { name: "Add wait step" }).click();

  await dragCueIntoContainer(page, SHORT_B, "Sequence");
  await expandContainerCue(page, "Sequence");

  await expect(
    containerCueRow(page, "Sequence").getByText(/3 cue\(s\) · sequential/),
  ).toBeVisible();

  await containerCueRow(page, "Sequence").click();
  const waitRow = sequenceCueList(page).locator("[data-cue-id]", {
    has: page.getByText(/^Wait ·/),
  });
  await waitRow.click();
  const duration = page.getByLabel("Duration (s)");
  await expect(duration).toBeVisible();
  await duration.fill("2");
  await duration.blur();
  await expect(duration).toHaveValue("2");

  await containerCueRow(page, "Sequence").click();
  await openActiveCuesTab(page);
  await pressTransportGo(page);

  await expect(activeCueRow(page, SHORT_A)).toBeVisible();
  await expect(activeCueRow(page, SHORT_A)).toBeHidden({ timeout: 15_000 });

  await expect(activeCueRow(page, SHORT_B)).toHaveCount(0);
  await expect.poll(async () => activeCueRow(page, SHORT_B).count(), { timeout: 5_000 }).toBe(0);

  await expect(activeCueRow(page, SHORT_B)).toBeVisible({ timeout: 15_000 });
});
