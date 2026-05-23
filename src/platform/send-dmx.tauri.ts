import { invoke } from "@tauri-apps/api/core";
import {
  artNetUniverseFromFixtureUniverse,
  DEFAULT_ART_NET_HOST,
  DEFAULT_ART_NET_PORT,
} from "../lib/dmx";
import type { DmxUniverseFrame } from "../lib/dmx";

export async function sendDmxUniversesTauri(
  frames: DmxUniverseFrame[],
  host = DEFAULT_ART_NET_HOST,
  port = DEFAULT_ART_NET_PORT,
): Promise<void> {
  for (const frame of frames) {
    try {
      await invoke("send_dmx", {
        host: host.trim() || DEFAULT_ART_NET_HOST,
        port,
        universe: artNetUniverseFromFixtureUniverse(frame.universe),
        data: [...frame.data],
      });
    } catch (err) {
      console.error("[dmx] Send failed", err);
    }
  }
}
