import { t } from "../i18n/t";
import { notifyWarningDeduped } from "../lib/notifications";
import type { MidiMessageHandler } from "./receive-midi";
import { getWebMidiAccess, resolveWebMidiInput } from "./web-midi";

export async function openMidiInput(
  portId: string | null,
  onMessage: MidiMessageHandler,
): Promise<() => void> {
  if (!portId) {
    return () => {};
  }

  const access = await getWebMidiAccess();
  if (!access) {
    notifyWarningDeduped(t("notification.webMidiUnavailable"));
    return () => {};
  }

  const input = resolveWebMidiInput(access, portId);
  if (!input) {
    notifyWarningDeduped(t("notification.midiInputUnavailable"));
    return () => {};
  }

  const handler = (e: MIDIMessageEvent) => {
    if (!e.data?.length) return;
    onMessage([...e.data]);
  };

  input.addEventListener("midimessage", handler);
  return () => input.removeEventListener("midimessage", handler);
}
