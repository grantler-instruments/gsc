import { notifyWarningDeduped } from "../lib/notifications";
import { getWebMidiAccess, resolveWebMidiOutput } from "./web-midi";

export async function sendMidiMessage(portId: string | null, message: number[]): Promise<void> {
  const access = await getWebMidiAccess();
  if (!access) {
    notifyWarningDeduped("Web MIDI is not available in this browser.");
    return;
  }
  const output = resolveWebMidiOutput(access, portId);
  if (!output) {
    notifyWarningDeduped("No MIDI output device is available.");
    return;
  }
  output.send(message);
}
