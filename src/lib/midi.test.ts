import { describe, expect, it } from "vitest";
import {
  clampMidiByte,
  clampMidiChannel,
  clampMidiPitchBend,
  encodeMidiMessage,
  formatMidiCue,
  MIDI_PITCH_BEND_CENTER,
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

  it("parses pitch bend with 14-bit resolution", () => {
    // Center (8192): LSB=0, MSB=64 → 0xE0, 0x00, 0x40
    expect(parseMidiMessage([0xe0, 0x00, 0x40])).toEqual({
      channel: 1,
      kind: "pitch-bend",
      pitchBend: 8192,
    });
    // Max (16383): LSB=127, MSB=127
    expect(parseMidiMessage([0xe0, 0x7f, 0x7f])).toEqual({
      channel: 1,
      kind: "pitch-bend",
      pitchBend: 16383,
    });
  });

  it("parses system real-time transport messages", () => {
    expect(parseMidiMessage([0xfa])).toEqual({ channel: 1, kind: "start" });
    expect(parseMidiMessage([0xfb])).toEqual({ channel: 1, kind: "continue" });
    expect(parseMidiMessage([0xfc])).toEqual({ channel: 1, kind: "stop" });
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

  it("round-trips pitch bend through parseMidiMessage", () => {
    const bytes = encodeMidiMessage({
      channel: 1,
      kind: "pitch-bend",
      pitchBend: 10000,
    });
    expect(bytes).toEqual([0xe0, 10000 & 0x7f, (10000 >> 7) & 0x7f]);
    expect(parseMidiMessage(bytes)).toEqual({
      channel: 1,
      kind: "pitch-bend",
      pitchBend: 10000,
    });
  });

  it("defaults pitch bend to center", () => {
    expect(encodeMidiMessage({ channel: 1, kind: "pitch-bend" })).toEqual([0xe0, 0x00, 0x40]);
  });

  it("encodes system real-time transport messages", () => {
    expect(encodeMidiMessage({ channel: 1, kind: "start" })).toEqual([0xfa]);
    expect(encodeMidiMessage({ channel: 1, kind: "continue" })).toEqual([0xfb]);
    expect(encodeMidiMessage({ channel: 1, kind: "stop" })).toEqual([0xfc]);
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

  it("matches pitch bend by 14-bit value", () => {
    const match = { channel: 1, kind: "pitch-bend" as const, pitchBend: 8192 };
    expect(midiMatches(match, { channel: 1, kind: "pitch-bend", pitchBend: 8192 })).toBe(true);
    expect(midiMatches(match, { channel: 1, kind: "pitch-bend", pitchBend: 8193 })).toBe(false);
  });

  it("matches system real-time transport by kind only", () => {
    const match = { channel: 1, kind: "start" as const };
    expect(midiMatches(match, { channel: 5, kind: "start" })).toBe(true);
    expect(midiMatches(match, { channel: 1, kind: "stop" })).toBe(false);
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

  it("clamps pitch bend to 14-bit range", () => {
    expect(clampMidiPitchBend(MIDI_PITCH_BEND_CENTER)).toBe(8192);
    expect(clampMidiPitchBend(-1)).toBe(0);
    expect(clampMidiPitchBend(20000)).toBe(16383);
  });
});
