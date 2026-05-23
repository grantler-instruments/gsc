import { invoke } from "@tauri-apps/api/core";
import { notifyErrorFromUnknown, notifyWarningDeduped } from "../lib/notifications";

export async function sendMidiMessage(portId: string | null, message: number[]): Promise<void> {
  if (!portId) {
    notifyWarningDeduped("Select a MIDI output in Settings before sending.");
    return;
  }
  try {
    await invoke("send_midi", { portId, message });
  } catch (err) {
    notifyErrorFromUnknown(err);
  }
}
