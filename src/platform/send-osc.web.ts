import type { OscCueData } from "../types/cue";

export async function sendOscMessage(_data: OscCueData): Promise<void> {
  console.warn("[osc] OSC sending is only available in the desktop app");
}
