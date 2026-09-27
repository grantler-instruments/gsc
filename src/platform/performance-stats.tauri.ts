import { invoke } from "@tauri-apps/api/core";
import type { MemoryPressure, ProcessStats } from "./performance-stats";

export async function getProcessStats(): Promise<ProcessStats | null> {
  return invoke<ProcessStats>("get_process_stats");
}

export async function getMemoryPressure(): Promise<MemoryPressure | null> {
  return invoke<MemoryPressure>("get_memory_pressure");
}
