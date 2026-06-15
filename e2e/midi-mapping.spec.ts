import { expect, test } from "@playwright/test";
import { addCueType } from "./helpers/add-cue";
import { gotoApp } from "./helpers/app";
import { dragCueIntoContainer, expandContainerCue } from "./helpers/container-cues";
import { containerCueRow, expectCueInSequenceList } from "./helpers/cue-list-panel";
import {
  dropAudioOnCueList,
  fixturePath,
  WHITE_NOISE_ALT_FIXTURE,
  WHITE_NOISE_ALT_NAME,
  WHITE_NOISE_FIXTURE,
  WHITE_NOISE_NAME,
} from "./helpers/drop-audio";
import {
  AUTO_MAP_START_NOTE,
  autoMapNotesToCues,
  closeSettings,
  configureMidiInput,
  expectActiveCue,
  expectNoActiveCues,
  expectTransportShowsCue,
  installMidiMock,
  learnGoCueMapping,
  learnMidiMapping,
  selectSequenceCue,
  sendMidiNoteOn,
} from "./helpers/midi";

const SHORT_A = "white-noise-short-a.wav";
const SHORT_B = "white-noise-short-b.wav";

test.describe.configure({ mode: "serial" });

test.beforeEach(async ({ page }) => {
  await installMidiMock(page);
});

test("MIDI learn maps next and previous cue actions", async ({ page }) => {
  await gotoApp(page, { resetStorage: true });

  await dropAudioOnCueList(page, WHITE_NOISE_FIXTURE, WHITE_NOISE_NAME);
  await dropAudioOnCueList(page, WHITE_NOISE_ALT_FIXTURE, WHITE_NOISE_ALT_NAME);
  await expectCueInSequenceList(page, WHITE_NOISE_NAME);
  await expectCueInSequenceList(page, WHITE_NOISE_ALT_NAME);

  await selectSequenceCue(page, WHITE_NOISE_NAME);
  await expectTransportShowsCue(page, WHITE_NOISE_NAME);

  await configureMidiInput(page);
  await learnMidiMapping(page, { action: "Next cue", note: 60 });
  await learnMidiMapping(page, { action: "Previous cue", note: 61 });
  await closeSettings(page);

  await selectSequenceCue(page, WHITE_NOISE_NAME);
  await sendMidiNoteOn(page, 60);
  await expectTransportShowsCue(page, WHITE_NOISE_ALT_NAME);

  await sendMidiNoteOn(page, 61);
  await expectTransportShowsCue(page, WHITE_NOISE_NAME);
});

test("MIDI GO (selected cue) starts playback", async ({ page }) => {
  await gotoApp(page, { resetStorage: true });

  await dropAudioOnCueList(page, WHITE_NOISE_FIXTURE, WHITE_NOISE_NAME);
  await expectCueInSequenceList(page, WHITE_NOISE_NAME);
  await selectSequenceCue(page, WHITE_NOISE_NAME);

  await configureMidiInput(page);
  await learnMidiMapping(page, { action: "GO (selected cue)", note: 60 });
  await closeSettings(page);

  await sendMidiNoteOn(page, 60);
  await expectActiveCue(page, WHITE_NOISE_NAME);
});

test("MIDI panic stops playback", async ({ page }) => {
  await gotoApp(page, { resetStorage: true });

  await dropAudioOnCueList(page, WHITE_NOISE_FIXTURE, WHITE_NOISE_NAME);
  await selectSequenceCue(page, WHITE_NOISE_NAME);

  await configureMidiInput(page);
  await learnMidiMapping(page, { action: "GO (selected cue)", note: 60 });
  await learnMidiMapping(page, { action: "Panic", note: 61 });
  await closeSettings(page);

  await sendMidiNoteOn(page, 60);
  await expectActiveCue(page, WHITE_NOISE_NAME);

  await sendMidiNoteOn(page, 61);
  await expectNoActiveCues(page);
});

test("MIDI GO cue fires a specific cue", async ({ page }) => {
  await gotoApp(page, { resetStorage: true });

  await dropAudioOnCueList(page, WHITE_NOISE_FIXTURE, WHITE_NOISE_NAME);
  await dropAudioOnCueList(page, WHITE_NOISE_ALT_FIXTURE, WHITE_NOISE_ALT_NAME);
  await selectSequenceCue(page, WHITE_NOISE_NAME);

  await configureMidiInput(page);
  await learnGoCueMapping(page, {
    cueOption: `2 — ${WHITE_NOISE_ALT_NAME}`,
    note: 62,
    expectedLabel: `GO 2 — ${WHITE_NOISE_ALT_NAME}`,
  });
  await closeSettings(page);

  await sendMidiNoteOn(page, 62);
  await expectActiveCue(page, WHITE_NOISE_ALT_NAME);
});

test("auto-map notes to cues GOs top-level cues from C2", async ({ page }) => {
  await gotoApp(page, { resetStorage: true });

  await dropAudioOnCueList(page, WHITE_NOISE_FIXTURE, WHITE_NOISE_NAME);
  await dropAudioOnCueList(page, WHITE_NOISE_ALT_FIXTURE, WHITE_NOISE_ALT_NAME);

  await configureMidiInput(page);
  await autoMapNotesToCues(page);
  await closeSettings(page);

  await sendMidiNoteOn(page, AUTO_MAP_START_NOTE);
  await expectActiveCue(page, WHITE_NOISE_NAME);

  await sendMidiNoteOn(page, AUTO_MAP_START_NOTE + 1);
  await expectActiveCue(page, WHITE_NOISE_ALT_NAME);
});

test("multiple MIDI messages can map to the same action", async ({ page }) => {
  await gotoApp(page, { resetStorage: true });

  await dropAudioOnCueList(page, WHITE_NOISE_FIXTURE, WHITE_NOISE_NAME);
  await dropAudioOnCueList(page, WHITE_NOISE_ALT_FIXTURE, WHITE_NOISE_ALT_NAME);
  await selectSequenceCue(page, WHITE_NOISE_NAME);

  await configureMidiInput(page);
  await learnMidiMapping(page, { action: "Next cue", note: 60 });
  await learnMidiMapping(page, { action: "Next cue", note: 61 });
  await closeSettings(page);

  await sendMidiNoteOn(page, 60);
  await expectTransportShowsCue(page, WHITE_NOISE_ALT_NAME);

  await selectSequenceCue(page, WHITE_NOISE_NAME);
  await sendMidiNoteOn(page, 61);
  await expectTransportShowsCue(page, WHITE_NOISE_ALT_NAME);
});

test("MIDI previous cue selects the group when approaching from below", async ({ page }) => {
  await gotoApp(page, { resetStorage: true });

  await dropAudioOnCueList(page, fixturePath(SHORT_A), SHORT_A, "audio/wav");
  await addCueType(page, "Parallel");
  await expect(containerCueRow(page, "Parallel")).toHaveCount(1);
  await dragCueIntoContainer(page, SHORT_A, "Parallel");
  await expandContainerCue(page, "Parallel");

  await dropAudioOnCueList(page, fixturePath(SHORT_B), SHORT_B, "audio/wav");
  await expectCueInSequenceList(page, SHORT_B);
  await selectSequenceCue(page, SHORT_B);

  await configureMidiInput(page);
  await learnMidiMapping(page, { action: "Previous cue", note: 70 });
  await closeSettings(page);

  await sendMidiNoteOn(page, 70);
  await expectTransportShowsCue(page, "group");
});
