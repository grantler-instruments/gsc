import { expect, test } from "@playwright/test";
import { gotoApp } from "./helpers/app";
import {
  copySelectedCues,
  cutSelectedCues,
  deleteSelectedCue,
  duplicateSelectedCues,
  pasteSelectedCues,
  redoProjectEdit,
  undoProjectEdit,
  waitPastHistoryCoalesce,
} from "./helpers/cue-editing";
import {
  expectCueInSequenceList,
  sequenceCueListPanel,
  sequenceCueRow,
} from "./helpers/cue-list-panel";
import { dropAudioOnCueList, fixturePath } from "./helpers/drop-audio";
import { waitForAutosavedCue } from "./helpers/project-session";

const FIXTURE = "white-noise-playback.wav";
const OTHER_FIXTURE = "white-noise-short-a.wav";

test.describe.configure({ mode: "serial" });

test("undo restores a deleted cue", async ({ page }) => {
  await gotoApp(page, { resetStorage: true });

  await dropAudioOnCueList(page, fixturePath(FIXTURE), FIXTURE, "audio/wav");
  await expectCueInSequenceList(page, FIXTURE);
  // Wait past project-history coalesce window so delete gets its own undo entry.
  await waitForAutosavedCue(page, FIXTURE);
  await waitPastHistoryCoalesce(page);

  await sequenceCueRow(page, FIXTURE).click();
  await deleteSelectedCue(page);
  await expect(sequenceCueRow(page, FIXTURE)).toHaveCount(0);

  await sequenceCueListPanel(page).click();
  await undoProjectEdit(page);
  await expectCueInSequenceList(page, FIXTURE);
});

test("redo re-applies a deleted cue after undo", async ({ page }) => {
  await gotoApp(page, { resetStorage: true });

  await dropAudioOnCueList(page, fixturePath(FIXTURE), FIXTURE, "audio/wav");
  await expectCueInSequenceList(page, FIXTURE);
  await waitForAutosavedCue(page, FIXTURE);
  await waitPastHistoryCoalesce(page);

  await sequenceCueRow(page, FIXTURE).click();
  await deleteSelectedCue(page);
  await expect(sequenceCueRow(page, FIXTURE)).toHaveCount(0);

  await undoProjectEdit(page);
  await expectCueInSequenceList(page, FIXTURE);

  await sequenceCueListPanel(page).click();
  await redoProjectEdit(page);
  await expect(sequenceCueRow(page, FIXTURE)).toHaveCount(0);
});

test("copy and paste duplicates the selected cue", async ({ page }) => {
  await gotoApp(page, { resetStorage: true });

  await dropAudioOnCueList(page, fixturePath(FIXTURE), FIXTURE, "audio/wav");
  await expectCueInSequenceList(page, FIXTURE);

  await sequenceCueRow(page, FIXTURE).click();
  await copySelectedCues(page);
  await pasteSelectedCues(page);

  await expect(sequenceCueRow(page, FIXTURE)).toHaveCount(2);
});

test("cut and paste moves the selected cue", async ({ page }) => {
  await gotoApp(page, { resetStorage: true });

  await dropAudioOnCueList(page, fixturePath(FIXTURE), FIXTURE, "audio/wav");
  await dropAudioOnCueList(page, fixturePath(OTHER_FIXTURE), OTHER_FIXTURE, "audio/wav");
  await expectCueInSequenceList(page, FIXTURE);
  await expectCueInSequenceList(page, OTHER_FIXTURE);

  await sequenceCueRow(page, FIXTURE).click();
  await cutSelectedCues(page);
  await expect(sequenceCueRow(page, FIXTURE)).toHaveCount(0);
  await expectCueInSequenceList(page, OTHER_FIXTURE);

  await sequenceCueRow(page, OTHER_FIXTURE).click();
  await pasteSelectedCues(page);
  await expect(sequenceCueRow(page, FIXTURE)).toHaveCount(1);
  await expect(sequenceCueRow(page, OTHER_FIXTURE)).toHaveCount(1);
});

test("duplicate creates a copy of the selected cue", async ({ page }) => {
  await gotoApp(page, { resetStorage: true });

  await dropAudioOnCueList(page, fixturePath(FIXTURE), FIXTURE, "audio/wav");
  await expectCueInSequenceList(page, FIXTURE);

  await sequenceCueRow(page, FIXTURE).click();
  await duplicateSelectedCues(page);

  await expect(sequenceCueRow(page, FIXTURE)).toHaveCount(2);
});
