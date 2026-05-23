import { describe, expect, it } from "vitest";
import {
  clampMidiByte,
  clampMidiChannel,
  encodeMidiMessage,
  formatMidiCue,
  midiMatches,
  noteNumberToName,
  parseMidiMessage,
} from "./midi";

describe("parseMidiMessage", () => {
  it("parses note-on", () => {
    expect(parseMidiMessage([0x90, 60, 100])).toEqual({
      channel: 1,
      kind: "note-on",
      note: 60,
      velocity: 100,
    });
  });

  it("parses control change on channel 2", () => {
    expect(parseMidiMessage([0xb1, 7, 64])).toEqual({
      channel: 2,
      kind: "control-change",
      controller: 7,
      value: 64,
    });
  });

  it("returns null for unsupported messages", () => {
    expect(parseMidiMessage([])).toBeNull();
    expect(parseMidiMessage([0xf8])).toBeNull();
  });
});

describe("encodeMidiMessage", () => {
  it("round-trips note-on through parseMidiMessage", () => {
    const bytes = encodeMidiMessage({
      channel: 1,
      kind: "note-on",
      note: 36,
      velocity: 127,
    });
    expect(parseMidiMessage(bytes)).toEqual({
      channel: 1,
      kind: "note-on",
      note: 36,
      velocity: 127,
    });
  });

  it("clamps out-of-range values", () => {
    expect(
      encodeMidiMessage({
        channel: 99,
        kind: "control-change",
        controller: 200,
        value: -5,
      }),
    ).toEqual([0xbf, 127, 0]);
  });
});

describe("midiMatches", () => {
  it("matches note-on by channel and note", () => {
    const match = { channel: 1, kind: "note-on" as const, note: 60, velocity: 127 };
    expect(midiMatches(match, { channel: 1, kind: "note-on", note: 60, velocity: 100 })).toBe(true);
    expect(midiMatches(match, { channel: 1, kind: "note-on", note: 61, velocity: 100 })).toBe(
      false,
    );
  });

  it("matches control change by controller and value", () => {
    const match = {
      channel: 1,
      kind: "control-change" as const,
      controller: 1,
      value: 64,
    };
    expect(
      midiMatches(match, {
        channel: 1,
        kind: "control-change",
        controller: 1,
        value: 64,
      }),
    ).toBe(true);
  });
});

describe("formatMidiCue", () => {
  it("formats note names", () => {
    expect(noteNumberToName(60)).toBe("C4");
    expect(
      formatMidiCue({
        channel: 1,
        kind: "note-on",
        note: 60,
        velocity: 100,
      }),
    ).toBe("Ch1 Note On C4 100");
  });
});

describe("clamp helpers", () => {
  it("clamps midi bytes and channels", () => {
    expect(clampMidiByte(200)).toBe(127);
    expect(clampMidiByte(-1)).toBe(0);
    expect(clampMidiChannel(0)).toBe(1);
    expect(clampMidiChannel(20)).toBe(16);
  });
});
