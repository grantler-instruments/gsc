import { getPlatform } from "./index";
import type { DeviceOption } from "../types/device";

export async function listSerialPorts(): Promise<DeviceOption[]> {
  if (getPlatform() !== "tauri") return [];
  const { listSerialPortsTauri } = await import("./serial-ports.tauri");
  return listSerialPortsTauri();
}
