import { invoke } from "@tauri-apps/api/core";
import type { ProcessStats } from "./performance-stats";

export async function getProcessStats(): Promise<ProcessStats | null> {
  return invoke<ProcessStats>("get_process_stats");
}
