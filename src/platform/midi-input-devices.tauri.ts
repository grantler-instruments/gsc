import { invoke } from "@tauri-apps/api/core";
import type { DeviceOption } from "../types/device";

export async function listMidiInputDevices(): Promise<DeviceOption[]> {
  return invoke<DeviceOption[]>("list_midi_input_ports");
}
