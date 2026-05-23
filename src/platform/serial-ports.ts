import type { DeviceOption } from "../types/device";
import { getPlatform } from "./index";

export async function listSerialPorts(): Promise<DeviceOption[]> {
  if (getPlatform() !== "tauri") return [];
  const { listSerialPortsTauri } = await import("./serial-ports.tauri");
  return listSerialPortsTauri();
}
