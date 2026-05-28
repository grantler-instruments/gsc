import { t } from "../i18n/t";
import type { DmxUniverseFrame } from "../lib/dmx";
import { buildEnttecProPacket, ENTTEC_PRO_BAUD_RATE } from "../lib/enttec-pro";
import { notifyErrorFromUnknown, notifyWarning, notifyWarningDeduped } from "../lib/notifications";

/** FTDI chip used by Enttec DMX USB Pro. */
const ENTTEC_USB_FILTERS: SerialPortFilter[] = [{ usbVendorId: 0x0403 }];

let port: SerialPort | null = null;
let writer: WritableStreamDefaultWriter<Uint8Array> | null = null;
let writeChain: Promise<void> = Promise.resolve();

function isWebSerialAvailable(): boolean {
  return typeof navigator !== "undefined" && "serial" in navigator;
}

export function isEnttecProWebSerialAvailable(): boolean {
  return isWebSerialAvailable();
}

export async function connectEnttecProWeb(): Promise<boolean> {
  if (!isWebSerialAvailable()) {
    notifyWarning(t("notification.webSerialUnavailable"));
    return false;
  }

  await disconnectEnttecProWeb();

  try {
    port = await navigator.serial?.requestPort({ filters: ENTTEC_USB_FILTERS });
    await port.open({ baudRate: ENTTEC_PRO_BAUD_RATE });
    writer = port.writable?.getWriter() ?? null;
    if (!writer) {
      await disconnectEnttecProWeb();
      notifyWarning(t("notification.enttecNoWritableStream"));
      return false;
    }
    return true;
  } catch (err) {
    await disconnectEnttecProWeb();
    notifyErrorFromUnknown(err);
    return false;
  }
}

export async function disconnectEnttecProWeb(): Promise<void> {
  writeChain = Promise.resolve();
  if (writer) {
    try {
      writer.releaseLock();
    } catch {
      // ignore
    }
    writer = null;
  }
  if (port) {
    try {
      await port.close();
    } catch {
      // ignore
    }
    port = null;
  }
}

export function isEnttecProConnectedWeb(): boolean {
  return port !== null && writer !== null;
}

export async function sendEnttecProUniversesWeb(frames: DmxUniverseFrame[]): Promise<void> {
  if (frames.length === 0 || !writer) return;

  writeChain = writeChain.then(async () => {
    for (const frame of frames) {
      const packet = buildEnttecProPacket(frame.universe, frame.data);
      if (!packet) {
        notifyWarningDeduped(t("notification.enttecUniverseLimit", { universe: frame.universe }));
        continue;
      }
      await writer?.write(packet);
    }
  });

  try {
    await writeChain;
  } catch (err) {
    notifyErrorFromUnknown(err);
  }
}
