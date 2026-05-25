import type { NdiOutputConfig, NdiOutputStatus, NdiSourceInfo } from "../types/ndi";
import { getPlatform } from "./index";

export async function ndiIsAvailable(): Promise<boolean> {
  if (getPlatform() !== "tauri") return false;
  const { ndiIsAvailable: check } = await import("./ndi.tauri");
  return check();
}

export async function listNdiSources(timeoutMs = 2000): Promise<NdiSourceInfo[]> {
  if (getPlatform() !== "tauri") return [];
  const { listNdiSources: list } = await import("./ndi.tauri");
  return list(timeoutMs);
}

export async function startNdiOutput(config: NdiOutputConfig): Promise<void> {
  if (getPlatform() !== "tauri") {
    throw new Error("NDI output requires the desktop app.");
  }
  const { startNdiOutput: start } = await import("./ndi.tauri");
  return start(config);
}

export async function stopNdiOutput(): Promise<void> {
  if (getPlatform() !== "tauri") return;
  const { stopNdiOutput: stop } = await import("./ndi.tauri");
  return stop();
}

export async function getNdiOutputStatus(): Promise<NdiOutputStatus> {
  if (getPlatform() !== "tauri") {
    return {
      running: false,
      available: false,
      sourceName: "",
      width: 0,
      height: 0,
      fps: 0,
      framesSent: 0,
      connectionCount: 0,
      lastError: null,
    };
  }
  const { getNdiOutputStatus: status } = await import("./ndi.tauri");
  return status();
}

export async function pushNdiFrame(width: number, height: number, data: Uint8Array): Promise<void> {
  if (getPlatform() !== "tauri") return;
  const { pushNdiFrame: push } = await import("./ndi.tauri");
  return push(width, height, data);
}
