import { getPlatform } from "./index";
import type { DmxUniverseFrame } from "../lib/dmx";
import { DEFAULT_ART_NET_HOST, DEFAULT_ART_NET_PORT } from "../lib/dmx";

export async function sendDmxUniverses(
  frames: DmxUniverseFrame[],
  host = DEFAULT_ART_NET_HOST,
  port = DEFAULT_ART_NET_PORT,
): Promise<void> {
  if (frames.length === 0) return;
  if (getPlatform() === "tauri") {
    const { sendDmxUniversesTauri } = await import("./send-dmx.tauri");
    await sendDmxUniversesTauri(frames, host, port);
    return;
  }
  const { sendDmxUniversesWeb } = await import("./send-dmx.web");
  await sendDmxUniversesWeb(frames, host, port);
}
