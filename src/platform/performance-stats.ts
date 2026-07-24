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
