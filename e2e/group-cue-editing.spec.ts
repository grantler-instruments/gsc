import { expect, test } from "@playwright/test";
import { addCueType } from "./helpers/add-cue";
import { gotoApp } from "./helpers/app";
import {
  cueRowOrderFor,
  dragCueIntoContainer,
  dragCueOutOfContainer,
  dragCueRelativeToRow,
  dragCueToContainerLeading,
  expandContainerCue,
  renameSelectedCue,
  ungroupContainer,
} from "./helpers/container-cues";
import { containerCueRow, expectCueInSequenceList } from "./helpers/cue-list-panel";
import { dropAudioOnCueList, fixturePath } from "./helpers/drop-audio";

const SHORT_A = "white-noise-short-a.wav";
const SHORT_B = "white-noise-short-b.wav";
const SHORT_C = "white-noise.wav";

test.describe.configure({ mode: "serial" });

async function prepareGroupWithThreeCues(page: import("@playwright/test").Page): Promise<void> {
  await gotoApp(page);

  await dropAudioOnCueList(page, fixturePath(SHORT_A), SHORT_A, "audio/wav");
  await dropAudioOnCueList(page, fixturePath(SHORT_B), SHORT_B, "audio/wav");
  await dropAudioOnCueList(page, fixturePath(SHORT_C), SHORT_C, "audio/wav");
  await expectCueInSequenceList(page, SHORT_A);
  await expectCueInSequenceList(page, SHORT_B);
  await expectCueInSequenceList(page, SHORT_C);

  await addCueType(page, "Parallel");
  await expect(containerCueRow(page, "Parallel")).toHaveCount(1);

  await dragCueIntoContainer(page, SHORT_A, "Parallel");
  await dragCueIntoContainer(page, SHORT_B, "Parallel");
  await dragCueIntoContainer(page, SHORT_C, "Parallel");
  await expandContainerCue(page, "Parallel");

  expect(await cueRowOrderFor(page, [SHORT_A, SHORT_B, SHORT_C])).toEqual([
    SHORT_A,
    SHORT_B,
    SHORT_C,
  ]);
}

test("reorders cues within a parallel group @structure", async ({ page }) => {
  await prepareGroupWithThreeCues(page);

  await dragCueRelativeToRow(page, SHORT_C, SHORT_A, "before");

  expect(await cueRowOrderFor(page, [SHORT_A, SHORT_B, SHORT_C])).toEqual([
    SHORT_C,
    SHORT_A,
    SHORT_B,
  ]);
});

test("inserts a top-level cue into the middle of a group @structure", async ({ page }) => {
  await gotoApp(page);

  await dropAudioOnCueList(page, fixturePath(SHORT_A), SHORT_A, "audio/wav");
  await dropAudioOnCueList(page, fixturePath(SHORT_B), SHORT_B, "audio/wav");
  await dropAudioOnCueList(page, fixturePath(SHORT_C), SHORT_C, "audio/wav");

  await addCueType(page, "Parallel");
  await dragCueIntoContainer(page, SHORT_A, "Parallel");
  await dragCueIntoContainer(page, SHORT_B, "Parallel");
  await expandContainerCue(page, "Parallel");

  await dragCueRelativeToRow(page, SHORT_C, SHORT_B, "before");

  expect(await cueRowOrderFor(page, [SHORT_A, SHORT_B, SHORT_C])).toEqual([
    SHORT_A,
    SHORT_C,
    SHORT_B,
  ]);
});

test("drags a cue out of a parallel group @structure", async ({ page }) => {
  await prepareGroupWithThreeCues(page);

  await dragCueOutOfContainer(page, SHORT_B, "Parallel");

  expect(await cueRowOrderFor(page, [SHORT_A, SHORT_B, SHORT_C])).toEqual([
    SHORT_A,
    SHORT_C,
    SHORT_B,
  ]);
  await expect(containerCueRow(page, "Parallel").getByText(/2 cue\(s\) · parallel/)).toBeVisible();
});

test("ungroups a parallel container @structure", async ({ page }) => {
  await prepareGroupWithThreeCues(page);

  await ungroupContainer(page, "Parallel");

  await expect(containerCueRow(page, "Parallel")).toHaveCount(0);
  expect(await cueRowOrderFor(page, [SHORT_A, SHORT_B, SHORT_C])).toEqual([
    SHORT_A,
    SHORT_B,
    SHORT_C,
  ]);
});

test("inserts a cue before a nested sequence inside a parallel group @structure", async ({
  page,
}) => {
  await gotoApp(page);

  await addCueType(page, "Parallel");
  await addCueType(page, "Sequence");
  await renameSelectedCue(page, "Inner Seq");

  await dragCueIntoContainer(page, "Inner Seq", "Parallel");
  await expandContainerCue(page, "Parallel");

  await dropAudioOnCueList(page, fixturePath(SHORT_A), SHORT_A, "audio/wav");
  await dropAudioOnCueList(page, fixturePath(SHORT_B), SHORT_B, "audio/wav");

  await dragCueToContainerLeading(page, SHORT_B, "Parallel");

  expect(await cueRowOrderFor(page, [SHORT_A, SHORT_B, "Inner Seq"])).toEqual([
    SHORT_B,
    "Inner Seq",
    SHORT_A,
  ]);
});

test("inserts a cue before a nested sequence via the sequence row top edge @structure", async ({
  page,
}) => {
  await gotoApp(page);

  await addCueType(page, "Parallel");
  await addCueType(page, "Sequence");
  await renameSelectedCue(page, "Inner Seq");

  await dragCueIntoContainer(page, "Inner Seq", "Parallel");
  await expandContainerCue(page, "Parallel");

  await dropAudioOnCueList(page, fixturePath(SHORT_A), SHORT_A, "audio/wav");
  await dropAudioOnCueList(page, fixturePath(SHORT_B), SHORT_B, "audio/wav");

  const sequenceRow = page.locator("[data-cue-id]", {
    has: page.getByText("Inner Seq", { exact: true }),
  });
  const box = await sequenceRow.boundingBox();
  if (!box) throw new Error("Sequence row not found");

  await dragCueRelativeToRow(page, SHORT_B, "Inner Seq", "before", {
    clientY: box.y + box.height * 0.1,
  });

  expect(await cueRowOrderFor(page, [SHORT_A, SHORT_B, "Inner Seq"])).toEqual([
    SHORT_B,
    "Inner Seq",
    SHORT_A,
  ]);
});
