import { canRouteAudioOutputDevice } from "../lib/audio-output";
import { getPlatform } from "./index";

export { canRouteAudioOutputDevice };

/** Desktop can enumerate outputs via cpal even when the WebView lacks setSinkId. */
export function canListAudioOutputDevices(): boolean {
  return getPlatform() === "tauri" || canRouteAudioOutputDevice();
}

let systemDefaultOutputName: string | null = null;

function normalizeDeviceName(name: string): string {
  return name.trim().toLowerCase();
}

/** Load the macOS default output device name (cpal). */
export async function initDesktopAudioOutput(): Promise<void> {
  if (getPlatform() !== "tauri") return;
  const { invoke } = await import("@tauri-apps/api/core");
  systemDefaultOutputName =
    (await invoke<string | null>("get_default_audio_output_device")) ?? null;
}

export function getSystemDefaultOutputName(): string | null {
  return systemDefaultOutputName;
}

/**
 * Use native cpal only for non-default outputs (e.g. BlackHole).
 * Built-in / system-default speakers use Web Audio so device switches
 * never leave a stale cpal stream running alongside the WebView output.
 */
export function shouldRouteViaNativeCpal(deviceId: string | null): boolean {
  if (getPlatform() !== "tauri" || !deviceId) return false;
  if (
    systemDefaultOutputName &&
    normalizeDeviceName(deviceId) === normalizeDeviceName(systemDefaultOutputName)
  ) {
    return false;
  }
  return true;
}

/** Whether the user can pick an output device in Settings. */
export function isAudioOutputSelectionSupported(): boolean {
  return getPlatform() === "tauri" || canRouteAudioOutputDevice();
}
