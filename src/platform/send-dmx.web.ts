import type { DmxUniverseFrame } from "../lib/dmx";

export async function sendDmxUniversesWeb(
  _frames: DmxUniverseFrame[],
  _host?: string,
  _port?: number,
): Promise<void> {
  console.warn("[dmx] DMX output requires the desktop app.");
}
