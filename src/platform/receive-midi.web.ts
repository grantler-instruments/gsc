import { notifyWarningDeduped } from "../lib/notifications";
import type { MidiMessageHandler } from "./receive-midi";
import { getWebMidiAccess, resolveWebMidiInput } from "./web-midi";

export async function openMidiInput(
  portId: string | null,
  onMessage: MidiMessageHandler,
): Promise<() => void> {
  if (!portId) {
    return () => {};
  }

  const access = await getWebMidiAccess();
  if (!access) {
    notifyWarningDeduped("Web MIDI is not available in this browser.");
    return () => {};
  }

  const input = resolveWebMidiInput(access, portId);
  if (!input) {
    notifyWarningDeduped("The selected MIDI input device is not available.");
    return () => {};
  }

  const handler = (e: MIDIMessageEvent) => {
    if (!e.data?.length) return;
    onMessage([...e.data]);
  };

  input.addEventListener("midimessage", handler);
  return () => input.removeEventListener("midimessage", handler);
}
