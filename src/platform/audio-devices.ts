import { getPlatform } from "./index";
import type { DeviceOption } from "../types/device";

export async function listAudioOutputDevices(): Promise<DeviceOption[]> {
  if (getPlatform() !== "tauri") return [];
  const { listAudioOutputDevices: list } = await import("./audio-devices.tauri");
  return list();
}
