import type { DeviceOption } from "../types/device";
import { getPlatform } from "./index";

export async function listMidiInputDevices(): Promise<DeviceOption[]> {
  if (getPlatform() === "tauri") {
    const { listMidiInputDevices: list } = await import("./midi-input-devices.tauri");
    return list();
  }
  const { listMidiInputDevices: list } = await import("./midi-input-devices.web");
  return list();
}
