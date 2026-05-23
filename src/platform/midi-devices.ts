import type { DeviceOption } from "../types/device";
import { getPlatform } from "./index";

export async function listMidiOutputDevices(): Promise<DeviceOption[]> {
  if (getPlatform() === "tauri") {
    const { listMidiOutputDevices: list } = await import("./midi-devices.tauri");
    return list();
  }
  const { listMidiOutputDevices: list } = await import("./midi-devices.web");
  return list();
}
