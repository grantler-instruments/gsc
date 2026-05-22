import type { MidiMessageHandler } from "./receive-midi";
import { getWebMidiAccess, resolveWebMidiInput } from "./web-midi";

export async function openMidiInput(
  portId: string | null,
  onMessage: MidiMessageHandler,
): Promise<() => void> {
  const access = await getWebMidiAccess();
  if (!access) {
    console.warn("[midi] Web MIDI is not available in this browser");
    return () => {};
  }

  const input = resolveWebMidiInput(access, portId);
  if (!input) {
    console.warn("[midi] No MIDI input device available");
    return () => {};
  }

  const handler = (e: MIDIMessageEvent) => {
    if (!e.data?.length) return;
    onMessage([...e.data]);
  };

  input.addEventListener("midimessage", handler);
  return () => input.removeEventListener("midimessage", handler);
}
