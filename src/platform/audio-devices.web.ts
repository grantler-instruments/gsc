import {
  canRouteAudioOutputDevice,
  probeDefaultOutputChannelCount,
  probeOutputChannelCount,
} from "../lib/audio-output";
import type { AudioOutputDeviceOption } from "../types/audio-device";

function deviceLabel(device: MediaDeviceInfo): string {
  const label = device.label.trim();
  if (label) return label;
  if (device.deviceId === "default") return "System default";
  return "Audio output";
}

async function toAudioOutputOption(device: MediaDeviceInfo): Promise<AudioOutputDeviceOption> {
  const channelCount = await probeOutputChannelCount(device.deviceId);
  return {
    id: device.deviceId,
    label: deviceLabel(device),
    channelCount,
  };
}

/** System default output when device selection is unavailable. */
export async function getDefaultAudioOutputDevice(): Promise<AudioOutputDeviceOption> {
  return {
    id: "default",
    label: "System default",
    channelCount: await probeDefaultOutputChannelCount(),
  };
}

/** List audio output devices with per-device channel counts (requires setSinkId). */
export async function listAudioOutputDevices(): Promise<AudioOutputDeviceOption[]> {
  if (!canRouteAudioOutputDevice()) {
    return [await getDefaultAudioOutputDevice()];
  }

  const devices = await navigator.mediaDevices.enumerateDevices();
  const outputs = devices.filter((device) => device.kind === "audiooutput");
  if (outputs.length === 0) return [];

  const options = await Promise.all(outputs.map((device) => toAudioOutputOption(device)));
  return options.sort((a, b) => a.label.localeCompare(b.label));
}
