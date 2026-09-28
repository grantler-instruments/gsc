import { getPlatform } from "./index";

export interface ProcessStats {
  cpuPercent: number;
  memoryMb: number;
}

/** Process CPU% and RSS for the current app. Null when unavailable (web). */
export async function getProcessStats(): Promise<ProcessStats | null> {
  if (getPlatform() !== "tauri") {
    const { getProcessStats: get } = await import("./performance-stats.web");
    return get();
  }
  const { getProcessStats: get } = await import("./performance-stats.tauri");
  return get();
}
export interface MemoryPressure {
  availableMb: number;
  totalMb: number;
  processMb: number;
}

/** System available / total RAM. Null when unavailable (web has no reliable OS API). */
export async function getMemoryPressure(): Promise<MemoryPressure | null> {
  if (getPlatform() !== "tauri") return null;
  const { getMemoryPressure: get } = await import("./performance-stats.tauri");
  return get();
}
