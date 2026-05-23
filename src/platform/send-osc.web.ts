import { notifyWarningDeduped } from "../lib/notifications";
import type { OscCueData } from "../types/cue";

export async function sendOscMessage(_data: OscCueData): Promise<void> {
  notifyWarningDeduped("OSC sending is only available in the desktop app.");
}
