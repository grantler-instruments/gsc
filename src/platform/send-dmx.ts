import type { DmxUniverseFrame } from "../lib/dmx";
import { DEFAULT_ART_NET_HOST, DEFAULT_ART_NET_PORT } from "../lib/dmx-defaults";
import {
  isSerialDmxBackend,
  resolveDmxOutputBackend,
  usePreferencesStore,
} from "../stores/preferences";
import { getPlatform } from "./index";

export async function sendDmxUniverses(
  frames: DmxUniverseFrame[],
  host = DEFAULT_ART_NET_HOST,
  port = DEFAULT_ART_NET_PORT,
): Promise<void> {
  if (frames.length === 0) return;

  const prefs = usePreferencesStore.getState();
  const backend = resolveDmxOutputBackend(prefs.dmxOutputBackend, getPlatform());

  if (backend === "deemex") {
    const { sendDeemexMidiUniverses } = await import("./deemex-midi");
    await sendDeemexMidiUniverses(frames);
    return;
  }

  if (isSerialDmxBackend(backend)) {
    const { sendEnttecProUniverses } = await import("./enttec-pro");
    await sendEnttecProUniverses(frames);
    return;
  }

  const resolvedHost = prefs.artNetHost.trim() || host;
  const resolvedPort = prefs.artNetPort || port;

  const { sendDmxUniversesTauri } = await import("./send-dmx.tauri");
  await sendDmxUniversesTauri(frames, resolvedHost, resolvedPort);
}
