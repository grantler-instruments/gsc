import { invoke } from "@tauri-apps/api/core";

export async function sendMidiMessage(
  portId: string | null,
  message: number[],
): Promise<void> {
  if (!portId) {
    console.warn("[midi] Select a MIDI interface in Settings before sending");
    return;
  }
  try {
    await invoke("send_midi", { portId, message });
  } catch (err) {
    console.warn("[midi] Send failed", err);
  }
}
