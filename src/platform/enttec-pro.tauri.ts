import { invoke } from "@tauri-apps/api/core";
import type { DmxUniverseFrame } from "../lib/dmx";

export async function connectEnttecProTauri(portId: string): Promise<void> {
  await invoke("connect_enttec_pro", { portId });
}

export async function disconnectEnttecProTauri(): Promise<void> {
  await invoke("disconnect_enttec_pro");
}

export async function isEnttecProConnectedTauri(): Promise<boolean> {
  return invoke<boolean>("is_enttec_pro_connected");
}

export async function sendEnttecProUniversesTauri(frames: DmxUniverseFrame[]): Promise<void> {
  if (frames.length === 0) return;
  await invoke("send_enttec_pro_dmx", {
    frames: frames.map((frame) => ({
      universe: frame.universe,
      data: [...frame.data],
    })),
  });
}
