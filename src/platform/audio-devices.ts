import type { DeviceOption } from "../types/device";
import { getPlatform } from "./index";

/** Desktop lists cpal output devices (names match native routing). */
export async function listAudioOutputDevices(): Promise<DeviceOption[]> {
  if (getPlatform() !== "tauri") return [];
  const { listAudioOutputDevices: listCpal } = await import("./audio-devices.tauri");
  return listCpal();
}
