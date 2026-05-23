import { getPlatform } from "./index";
import type { DmxUniverseFrame } from "../lib/dmx";

export async function connectEnttecPro(portId: string | null): Promise<boolean> {
  if (getPlatform() === "tauri") {
    if (!portId) return false;
    const { connectEnttecProTauri } = await import("./enttec-pro.tauri");
    try {
      await connectEnttecProTauri(portId);
      return true;
    } catch (err) {
      console.warn("[dmx] Enttec Pro connection failed", err);
      return false;
    }
  }

  const { connectEnttecProWeb } = await import("./enttec-pro.web");
  return connectEnttecProWeb();
}

export async function disconnectEnttecPro(): Promise<void> {
  if (getPlatform() === "tauri") {
    const { disconnectEnttecProTauri } = await import("./enttec-pro.tauri");
    await disconnectEnttecProTauri();
    return;
  }
  const { disconnectEnttecProWeb } = await import("./enttec-pro.web");
  await disconnectEnttecProWeb();
}

export async function isEnttecProConnected(): Promise<boolean> {
  if (getPlatform() === "tauri") {
    const { isEnttecProConnectedTauri } = await import("./enttec-pro.tauri");
    return isEnttecProConnectedTauri();
  }
  const { isEnttecProConnectedWeb } = await import("./enttec-pro.web");
  return isEnttecProConnectedWeb();
}

export async function sendEnttecProUniverses(
  frames: DmxUniverseFrame[],
): Promise<void> {
  if (frames.length === 0) return;
  if (getPlatform() === "tauri") {
    const { sendEnttecProUniversesTauri } = await import("./enttec-pro.tauri");
    try {
      await sendEnttecProUniversesTauri(frames);
    } catch (err) {
      console.error("[dmx] Enttec Pro send failed", err);
    }
    return;
  }
  const { sendEnttecProUniversesWeb } = await import("./enttec-pro.web");
  await sendEnttecProUniversesWeb(frames);
}

export async function isEnttecProWebSerialAvailable(): Promise<boolean> {
  if (getPlatform() === "tauri") return false;
  const { isEnttecProWebSerialAvailable: available } = await import(
    "./enttec-pro.web"
  );
  return available();
}
