import { invoke } from "@tauri-apps/api/core";
import type { DeviceOption } from "../types/device";

export async function listMidiOutputDevices(): Promise<DeviceOption[]> {
  return invoke<DeviceOption[]>("list_midi_ports");
}
