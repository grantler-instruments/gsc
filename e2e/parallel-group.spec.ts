import { expect, test } from "@playwright/test";
import {
  activeCueRow,
  activeCuesPanel,
  openActiveCuesTab,
  pressTransportGo,
} from "./helpers/active-cues";
import { addCueType } from "./helpers/add-cue";
import { gotoApp } from "./helpers/app";
import { dragCueIntoContainer, expandContainerCue } from "./helpers/container-cues";
import { containerCueRow, expectCueInSequenceList } from "./helpers/cue-list-panel";
import { dropAudioOnCueList, fixturePath } from "./helpers/drop-audio";

const SHORT_A = "white-noise-short-a.wav";
const SHORT_B = "white-noise-short-b.wav";

test.describe.configure({ mode: "serial" });

async function prepareParallelGroup(page: import("@playwright/test").Page): Promise<void> {
  await gotoApp(page);

  await dropAudioOnCueList(page, fixturePath(SHORT_A), SHORT_A, "audio/wav");
  await dropAudioOnCueList(page, fixturePath(SHORT_B), SHORT_B, "audio/wav");
  await expectCueInSequenceList(page, SHORT_A);
  await expectCueInSequenceList(page, SHORT_B);

  await addCueType(page, "Parallel");
  await expect(containerCueRow(page, "Parallel")).toHaveCount(1);

  await dragCueIntoContainer(page, SHORT_A, "Parallel");
  await dragCueIntoContainer(page, SHORT_B, "Parallel");
  await expandContainerCue(page, "Parallel");

  await expect(containerCueRow(page, "Parallel").getByText(/2 cue\(s\) · parallel/)).toBeVisible();
}

test("parallel group fires all children on single GO @smoke @structure", async ({ page }) => {
  test.setTimeout(60_000);

  await prepareParallelGroup(page);
  await containerCueRow(page, "Parallel").click();
  await openActiveCuesTab(page);

  await pressTransportGo(page);

  await expect(activeCuesPanel(page).getByRole("button", { name: "Stop all" })).toBeVisible();
  await expect(activeCueRow(page, SHORT_A)).toBeVisible({ timeout: 10_000 });
  await expect(activeCueRow(page, SHORT_B)).toBeVisible({ timeout: 10_000 });
});
