import { invoke } from "@tauri-apps/api/core";
import { serializeOscArgsForInvoke } from "../lib/osc";
import type { OscCueData } from "../types/cue";

export async function sendOscMessage(data: OscCueData): Promise<void> {
  const args = serializeOscArgsForInvoke(data.args);
  if (!data.host.trim()) {
    console.warn("[osc] Host is required");
    return;
  }
  if (!data.address.startsWith("/")) {
    console.warn("[osc] Address must start with / — got:", data.address);
    return;
  }
  try {
    await invoke("send_osc", {
      host: data.host.trim(),
      port: data.port,
      address: data.address,
      args,
    });
  } catch (err) {
    console.error("[osc] Send failed", err);
  }
}
