/** Deemex MIDI mode (see grantler-instruments/deemex firmware). */

export const DEEMEX_MIDI_MAX_DMX_CHANNEL = 512;
export const DEFAULT_DEEMEX_MIDI_START_CHANNEL = 1;
export const DEEMEX_NOTE_ON_MIDI_CHANNELS = 5;
const CONTROLS_PER_MIDI_CHANNEL = 32;
const NOTES_PER_MIDI_CHANNEL = 127;

export function clampDeemexMidiStartChannel(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_DEEMEX_MIDI_START_CHANNEL;
  return Math.max(1, Math.min(16, Math.round(value)));
}

/** MIDI channels used for note-on mapping at the given start channel. */
export function deemexNoteOnMidiChannelCount(startChannel: number): number {
  const clamped = clampDeemexMidiStartChannel(startChannel);
  return Math.min(DEEMEX_NOTE_ON_MIDI_CHANNELS, 17 - clamped);
}

/** Maximum DMX channels reachable via note-on at the given start channel. */
export function deemexMaxDmxChannels(startChannel: number): number {
  return Math.min(
    DEEMEX_MIDI_MAX_DMX_CHANNEL,
    deemexNoteOnMidiChannelCount(startChannel) * NOTES_PER_MIDI_CHANNEL,
  );
}

export function deemexUsesControlChangeEncoding(startChannel: number): boolean {
  return clampDeemexMidiStartChannel(startChannel) === 1;
}

export function deemexDmxChannelToMidi(dmxChannel: number): {
  midiChannel: number;
  msbCc: number;
  lsbCc: number;
} | null {
  if (dmxChannel < 1 || dmxChannel > DEEMEX_MIDI_MAX_DMX_CHANNEL) return null;
  const index = dmxChannel - 1;
  return {
    midiChannel: Math.floor(index / CONTROLS_PER_MIDI_CHANNEL) + 1,
    msbCc: index % CONTROLS_PER_MIDI_CHANNEL,
    lsbCc: (index % CONTROLS_PER_MIDI_CHANNEL) + CONTROLS_PER_MIDI_CHANNEL,
  };
}

export function deemexDmxChannelToNoteOn(
  dmxChannel: number,
  startChannel: number,
): { midiChannel: number; note: number } | null {
  const clampedStart = clampDeemexMidiStartChannel(startChannel);
  const maxChannels = deemexMaxDmxChannels(clampedStart);
  if (dmxChannel < 1 || dmxChannel > maxChannels) return null;

  const index = dmxChannel - 1;
  const slot = Math.floor(index / NOTES_PER_MIDI_CHANNEL);
  const note = (index % NOTES_PER_MIDI_CHANNEL) + 1;
  const midiChannel = clampedStart + slot;
  if (midiChannel > clampedStart + DEEMEX_NOTE_ON_MIDI_CHANNELS - 1 || midiChannel > 16) {
    return null;
  }

  return { midiChannel, note };
}

export function deemexDmxValueToMsbLsb(dmxValue: number): { msb: number; lsb: number } {
  const clamped = Math.max(0, Math.min(255, Math.round(dmxValue)));
  const fullValue = clamped << 6;
  return {
    msb: (fullValue >> 7) & 0x7f,
    lsb: fullValue & 0x7f,
  };
}

function deemexDmxValueToNoteVelocity(dmxValue: number): number {
  if (dmxValue <= 0) return 0;
  return Math.min(127, Math.round(dmxValue / 2));
}

/** Two control-change messages (MSB then LSB) for one DMX channel. */
export function buildDeemexControlChangeMessages(dmxChannel: number, dmxValue: number): number[][] {
  const mapping = deemexDmxChannelToMidi(dmxChannel);
  if (!mapping) return [];

  const { msb, lsb } = deemexDmxValueToMsbLsb(dmxValue);
  const status = 0xb0 + (mapping.midiChannel - 1);
  return [
    [status, mapping.msbCc, msb],
    [status, mapping.lsbCc, lsb],
  ];
}

/** Note-on/off messages for one DMX channel (matches deemex note-on start channel). */
export function buildDeemexNoteMessages(
  dmxChannel: number,
  dmxValue: number,
  startChannel: number,
): number[][] {
  const mapping = deemexDmxChannelToNoteOn(dmxChannel, startChannel);
  if (!mapping) return [];

  const statusOff = 0x80 + (mapping.midiChannel - 1);
  const velocity = deemexDmxValueToNoteVelocity(dmxValue);
  if (velocity <= 0) {
    return [[statusOff, mapping.note, 0]];
  }

  const statusOn = 0x90 + (mapping.midiChannel - 1);
  return [[statusOn, mapping.note, velocity]];
}

export function buildDeemexMidiMessages(
  dmxChannel: number,
  dmxValue: number,
  startChannel: number,
): number[][] {
  if (deemexUsesControlChangeEncoding(startChannel)) {
    return buildDeemexControlChangeMessages(dmxChannel, dmxValue);
  }
  return buildDeemexNoteMessages(dmxChannel, dmxValue, startChannel);
}
