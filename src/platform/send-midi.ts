import { getPlatform } from "./index";

/** Send a short MIDI message (1–3 bytes) to the given output port id. */
export async function sendMidiMessage(portId: string | null, message: number[]): Promise<void> {
  if (message.length === 0) return;
  if (getPlatform() === "tauri") {
    const { sendMidiMessage: send } = await import("./send-midi.tauri");
    return send(portId, message);
  }
  const { sendMidiMessage: send } = await import("./send-midi.web");
  return send(portId, message);
}
