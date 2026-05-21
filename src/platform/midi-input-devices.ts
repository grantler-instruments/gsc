import { getPlatform } from "./index";
import type { DeviceOption } from "../types/device";

export async function listMidiInputDevices(): Promise<DeviceOption[]> {
  if (getPlatform() === "tauri") {
    const { listMidiInputDevices: list } = await import(
      "./midi-input-devices.tauri"
    );
    return list();
  }
  const { listMidiInputDevices: list } = await import("./midi-input-devices.web");
  return list();
}
