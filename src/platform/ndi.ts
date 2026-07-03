import type { NdiOutputConfig, NdiOutputStatus, NdiSourceInfo } from "../types/ndi";
import { NDI_ENABLED, NDI_OUTPUT_STOPPED } from "../types/ndi";
import { getPlatform } from "./index";

export async function ndiIsAvailable(): Promise<boolean> {
  if (!NDI_ENABLED || getPlatform() !== "tauri") return false;
  const { ndiIsAvailable: check } = await import("./ndi.tauri");
  return check();
}

export async function listNdiSources(timeoutMs = 2000): Promise<NdiSourceInfo[]> {
  if (!NDI_ENABLED || getPlatform() !== "tauri") return [];
  const { listNdiSources: list } = await import("./ndi.tauri");
  return list(timeoutMs);
}

export async function startNdiOutput(config: NdiOutputConfig): Promise<void> {
  if (!NDI_ENABLED) return;
  if (getPlatform() !== "tauri") {
    throw new Error("NDI output requires the desktop app.");
  }
  const { startNdiOutput: start } = await import("./ndi.tauri");
  return start(config);
}

export async function stopNdiOutput(): Promise<void> {
  if (!NDI_ENABLED || getPlatform() !== "tauri") return;
  const { stopNdiOutput: stop } = await import("./ndi.tauri");
  return stop();
}

export async function getNdiOutputStatus(): Promise<NdiOutputStatus> {
  if (!NDI_ENABLED || getPlatform() !== "tauri") {
    return NDI_OUTPUT_STOPPED;
  }
  const { getNdiOutputStatus: status } = await import("./ndi.tauri");
  return status();
}

export async function pushNdiFrame(width: number, height: number, data: Uint8Array): Promise<void> {
  if (!NDI_ENABLED || getPlatform() !== "tauri") return;
  const { pushNdiFrame: push } = await import("./ndi.tauri");
  return push(width, height, data);
}
