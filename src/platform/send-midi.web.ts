import { t } from "../i18n/t";
import { notifyWarningDeduped } from "../lib/notifications";
import { getWebMidiAccess, resolveWebMidiOutput } from "./web-midi";

export async function sendMidiMessage(portId: string | null, message: number[]): Promise<void> {
  const access = await getWebMidiAccess();
  if (!access) {
    notifyWarningDeduped(t("notification.webMidiUnavailable"));
    return;
  }
  const output = resolveWebMidiOutput(access, portId);
  if (!output) {
    notifyWarningDeduped(t("notification.noMidiOutput"));
    return;
  }
  output.send(message);
}
