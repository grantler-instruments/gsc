import { describe, expect, it } from "vitest";
import {
  buildDeemexControlChangeMessages,
  buildDeemexMidiMessages,
  buildDeemexNoteMessages,
  deemexDmxChannelToMidi,
  deemexDmxChannelToNoteOn,
  deemexDmxValueToMsbLsb,
  deemexMaxDmxChannels,
  deemexUsesControlChangeEncoding,
} from "./deemex-midi";

describe("deemex-midi", () => {
  it("maps DMX channel 1 to MIDI ch 1 CC 0/32", () => {
    expect(deemexDmxChannelToMidi(1)).toEqual({ midiChannel: 1, msbCc: 0, lsbCc: 32 });
  });

  it("maps DMX channel 512 to MIDI ch 16 CC 31/63", () => {
    expect(deemexDmxChannelToMidi(512)).toEqual({ midiChannel: 16, msbCc: 31, lsbCc: 63 });
  });

  it("encodes DMX 255 as MSB 127 / LSB 64", () => {
    expect(deemexDmxValueToMsbLsb(255)).toEqual({ msb: 127, lsb: 64 });
  });

  it("builds paired control changes for a channel when start is 1", () => {
    expect(buildDeemexControlChangeMessages(1, 255)).toEqual([
      [0xb0, 0, 127],
      [0xb0, 32, 64],
    ]);
  });

  it("uses CC encoding only for start channel 1", () => {
    expect(deemexUsesControlChangeEncoding(1)).toBe(true);
    expect(deemexUsesControlChangeEncoding(13)).toBe(false);
  });

  it("limits note-on channels for start channel 13", () => {
    expect(deemexMaxDmxChannels(13)).toBe(508);
    expect(deemexDmxChannelToNoteOn(1, 13)).toEqual({ midiChannel: 13, note: 1 });
    expect(deemexDmxChannelToNoteOn(127, 13)).toEqual({ midiChannel: 13, note: 127 });
    expect(deemexDmxChannelToNoteOn(128, 13)).toEqual({ midiChannel: 14, note: 1 });
    expect(deemexDmxChannelToNoteOn(509, 13)).toBeNull();
  });

  it("builds note-on for start channel 13", () => {
    expect(buildDeemexNoteMessages(1, 254, 13)).toEqual([[0x90 + 12, 1, 127]]);
    expect(buildDeemexNoteMessages(1, 0, 13)).toEqual([[0x80 + 12, 1, 0]]);
  });

  it("routes buildDeemexMidiMessages by start channel", () => {
    expect(buildDeemexMidiMessages(1, 255, 1)).toEqual([
      [0xb0, 0, 127],
      [0xb0, 32, 64],
    ]);
    expect(buildDeemexMidiMessages(1, 200, 13)).toEqual([[0x90 + 12, 1, 100]]);
  });
});
