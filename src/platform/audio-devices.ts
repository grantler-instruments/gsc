import type { DeviceOption } from "../types/device";
import { getPlatform } from "./index";

export async function listAudioOutputDevices(): Promise<DeviceOption[]> {
  if (getPlatform() !== "tauri") return [];
  const { listAudioOutputDevices: list } = await import("./audio-devices.tauri");
  return list();
}
