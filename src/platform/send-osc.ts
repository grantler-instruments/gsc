import { getPlatform } from "./index";
import type { OscCueData } from "../types/cue";

/** Send an OSC message to the destination in the cue data. */
export async function sendOscMessage(data: OscCueData): Promise<void> {
  if (getPlatform() === "tauri") {
    const { sendOscMessage: send } = await import("./send-osc.tauri");
    return send(data);
  }
  const { sendOscMessage: send } = await import("./send-osc.web");
  return send(data);
}
