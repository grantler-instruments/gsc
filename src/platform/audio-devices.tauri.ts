import { invoke } from "@tauri-apps/api/core";
import type { DeviceOption } from "../types/device";

export async function listAudioOutputDevices(): Promise<DeviceOption[]> {
  return invoke<DeviceOption[]>("list_audio_output_devices");
}
