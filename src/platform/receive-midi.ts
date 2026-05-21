import { getPlatform } from "./index";

export type MidiMessageHandler = (data: number[]) => void;

/** Open MIDI input; returns cleanup. */
export async function openMidiInput(
  portId: string | null,
  onMessage: MidiMessageHandler,
): Promise<() => void> {
  if (getPlatform() === "tauri") {
    const { openMidiInput: open } = await import("./receive-midi.tauri");
    return open(portId, onMessage);
  }
  const { openMidiInput: open } = await import("./receive-midi.web");
  return open(portId, onMessage);
}
