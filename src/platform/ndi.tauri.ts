import { invoke } from "@tauri-apps/api/core";
import type { NdiOutputConfig, NdiOutputStatus, NdiSourceInfo } from "../types/ndi";

export async function ndiIsAvailable(): Promise<boolean> {
  return invoke<boolean>("ndi_is_available");
}

export async function listNdiSources(timeoutMs: number): Promise<NdiSourceInfo[]> {
  return invoke<NdiSourceInfo[]>("list_ndi_sources", { timeoutMs });
}

export async function startNdiOutput(config: NdiOutputConfig): Promise<void> {
  await invoke("start_ndi_output", { config });
}

export async function stopNdiOutput(): Promise<void> {
  await invoke("stop_ndi_output");
}

export async function getNdiOutputStatus(): Promise<NdiOutputStatus> {
  return invoke<NdiOutputStatus>("get_ndi_output_status");
}

export async function pushNdiFrame(
  width: number,
  height: number,
  data: Uint8Array,
): Promise<void> {
  await invoke("push_ndi_frame", { width, height, data: Array.from(data) });
}
