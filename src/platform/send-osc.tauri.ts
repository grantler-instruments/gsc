import { invoke } from "@tauri-apps/api/core";
import { notifyErrorFromUnknown, notifyWarning } from "../lib/notifications";
import { serializeOscArgsForInvoke } from "../lib/osc";
import type { OscCueData } from "../types/cue";

export async function sendOscMessage(data: OscCueData): Promise<void> {
  const args = serializeOscArgsForInvoke(data.args);
  if (!data.host.trim()) {
    notifyWarning("OSC host is required.");
    return;
  }
  if (!data.address.startsWith("/")) {
    notifyWarning(`OSC address must start with / (got "${data.address}").`);
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
    notifyErrorFromUnknown(err);
  }
}
