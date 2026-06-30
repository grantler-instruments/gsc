export interface AudioInputDeviceOption {
  id: string;
  label: string;
}

/** Select value for the browser's default input (not a concrete device id). */
export const DEFAULT_AUDIO_INPUT_ID = "system-default";

export function isDefaultAudioInputId(deviceId: string | undefined): boolean {
  return !deviceId || deviceId === DEFAULT_AUDIO_INPUT_ID;
}

export function isAudioInputSupported(): boolean {
  return typeof navigator !== "undefined" && Boolean(navigator.mediaDevices?.enumerateDevices);
}

export function closeAudioInputStream(stream: MediaStream | null | undefined): void {
  if (!stream) return;
  for (const track of stream.getTracks()) {
    track.stop();
  }
}

export async function openAudioInputStream(deviceId?: string): Promise<MediaStream> {
  if (!isAudioInputSupported()) {
    throw new Error("Audio input not supported");
  }
  const constraints: MediaStreamConstraints = {
    audio: isDefaultAudioInputId(deviceId) ? true : { deviceId: { ideal: deviceId } },
  };
  return navigator.mediaDevices.getUserMedia(constraints);
}

/** Prompt for mic access so enumerateDevices returns readable labels. */
export async function ensureAudioInputAccess(): Promise<MediaStream | null> {
  try {
    return await openAudioInputStream();
  } catch {
    return null;
  }
}

/** List microphone / line-in devices (call after ensureAudioInputAccess for labels). */
export async function listAudioInputDevices(): Promise<AudioInputDeviceOption[]> {
  if (!isAudioInputSupported()) return [];

  const devices = await navigator.mediaDevices.enumerateDevices();
  const seenLabels = new Set<string>();

  return devices
    .filter((device) => device.kind === "audioinput")
    .filter((device) => device.deviceId !== "default")
    .map((device) => ({
      id: device.deviceId,
      label: device.label.trim() || "Microphone",
    }))
    .filter((device) => {
      if (seenLabels.has(device.label)) return false;
      seenLabels.add(device.label);
      return true;
    })
    .sort((a, b) => a.label.localeCompare(b.label));
}
