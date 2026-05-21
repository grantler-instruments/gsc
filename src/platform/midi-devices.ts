import { getPlatform } from "./index";
import type { DeviceOption } from "../types/device";

export async function listMidiOutputDevices(): Promise<DeviceOption[]> {
  if (getPlatform() === "tauri") {
    const { listMidiOutputDevices: list } = await import("./midi-devices.tauri");
    return list();
  }
  const { listMidiOutputDevices: list } = await import("./midi-devices.web");
  return list();
}
