import { invoke } from "@tauri-apps/api/core";
import { t } from "../i18n/t";
import { notifyErrorFromUnknown, notifyWarningDeduped } from "../lib/notifications";

export async function sendMidiMessage(portId: string | null, message: number[]): Promise<void> {
  if (!portId) {
    notifyWarningDeduped(t("notification.selectMidiOutput"));
    return;
  }
  try {
    await invoke("send_midi", { portId, message });
  } catch (err) {
    notifyErrorFromUnknown(err);
  }
}
