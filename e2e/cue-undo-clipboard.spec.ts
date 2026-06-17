import { expect, test } from "@playwright/test";
import { gotoApp } from "./helpers/app";
import {
  copySelectedCues,
  deleteSelectedCue,
  pasteSelectedCues,
  undoProjectEdit,
} from "./helpers/cue-editing";
import { expectCueInSequenceList, sequenceCueRow } from "./helpers/cue-list-panel";
import { dropAudioOnCueList, fixturePath } from "./helpers/drop-audio";
import { waitForAutosavedCue } from "./helpers/project-session";

const FIXTURE = "white-noise-playback.wav";

test.describe.configure({ mode: "serial" });

test("undo restores a deleted cue", async ({ page }) => {
  await gotoApp(page, { resetStorage: true });

  await dropAudioOnCueList(page, fixturePath(FIXTURE), FIXTURE, "audio/wav");
  await expectCueInSequenceList(page, FIXTURE);
  // Wait past project-history coalesce window so delete gets its own undo entry.
  await waitForAutosavedCue(page, FIXTURE);

  await sequenceCueRow(page, FIXTURE).click();
  await deleteSelectedCue(page);
  await expect(sequenceCueRow(page, FIXTURE)).toHaveCount(0);

  await undoProjectEdit(page);
  await expectCueInSequenceList(page, FIXTURE);
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
