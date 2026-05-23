import { invoke } from "@tauri-apps/api/core";
import type { DeviceOption } from "../types/device";

export async function listSerialPortsTauri(): Promise<DeviceOption[]> {
  return invoke<DeviceOption[]>("list_serial_ports");
}
