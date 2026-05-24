import { t } from "../i18n/t";
import { notifyWarningDeduped } from "../lib/notifications";
import type { OscCueData } from "../types/cue";

export async function sendOscMessage(_data: OscCueData): Promise<void> {
  notifyWarningDeduped(t("notification.oscDesktopOnly"));
}
