import { getPlatform } from "./index";

/** Mark a `.gsc` directory as a macOS package so Finder shows a single-file icon. */
export async function markGscProjectPackage(path: string): Promise<void> {
  if (getPlatform() !== "tauri") return;
  try {
    const { invoke } = await import("@tauri-apps/api/core");
    await invoke("mark_gsc_project_package", { path });
  } catch (err) {
    console.warn("[macos] Could not mark project as package", err);
  }
}
