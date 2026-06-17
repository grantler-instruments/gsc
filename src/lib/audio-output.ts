import type { Cue } from "../types/cue";

export const DEFAULT_OUTPUT_CHANNELS: readonly [number, number] = [1, 2];

export function canRouteAudioOutputDevice(): boolean {
  return typeof AudioContext !== "undefined" && "setSinkId" in AudioContext.prototype;
}

/** Whether Web Audio can target a specific output device via setSinkId. */
export function isAudioOutputSelectionSupported(): boolean {
  return canRouteAudioOutputDevice();
}

export async function resolveMediaSinkId(deviceId: string | null): Promise<string> {
  if (!deviceId || deviceId === "default") return "";
  if (!canRouteAudioOutputDevice()) return "";
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.enumerateDevices) {
    return "";
  }

  const devices = await navigator.mediaDevices.enumerateDevices();
  const outputs = devices.filter((device) => device.kind === "audiooutput");
  const byId = outputs.find((device) => device.deviceId === deviceId);
  if (byId) return byId.deviceId;

  const needle = deviceId.toLowerCase();
  const byLabel =
    outputs.find((device) => device.label.toLowerCase() === needle) ??
    outputs.find((device) => device.label.toLowerCase().includes(needle)) ??
    outputs.find((device) => needle.includes(device.label.toLowerCase()));
  if (byLabel) return byLabel.deviceId;

  console.warn(`[audio] No media sink for output device "${deviceId}"`);
  return "";
}

export async function probeDefaultOutputChannelCount(): Promise<number> {
  if (typeof AudioContext === "undefined") return 2;

  const ctx = new AudioContext();
  try {
    if (ctx.state === "suspended") {
      await ctx.resume();
    }
    return Math.max(1, ctx.destination.maxChannelCount);
  } finally {
    await ctx.close();
  }
}

export async function probeOutputChannelCount(deviceId: string): Promise<number> {
  if (!canRouteAudioOutputDevice()) {
    return probeDefaultOutputChannelCount();
  }

  const sinkId = deviceId || "";
  const ctx = new AudioContext({ sinkId });
  try {
    if (ctx.state === "suspended") {
      await ctx.resume();
    }
    return Math.max(1, ctx.destination.maxChannelCount);
  } finally {
    await ctx.close();
  }
}

/** 1-based output channels for a cue; defaults to the first stereo pair. */
export function resolveOutputChannels(cue: Pick<Cue, "outputChannels">): number[] {
  const channels = cue.outputChannels;
  if (!channels?.length) return [...DEFAULT_OUTPUT_CHANNELS];
  return channels.map((channel) => Math.max(1, Math.round(channel)));
}

export function outputChannelsEqual(a: number[], b: number[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((value, index) => value === b[index]);
}

export function clampOutputChannel(channel: number, maxChannel: number): number {
  return Math.min(maxChannel, Math.max(1, Math.round(channel)));
}

export function normalizeCueOutputChannels(
  channels: number[] | undefined,
  maxChannel: number,
): number[] | undefined {
  if (!channels?.length) return undefined;

  const normalized = channels.slice(0, 2).map((channel) => clampOutputChannel(channel, maxChannel));

  if (normalized.length === 1) return normalized;

  const [left, right] = normalized;
  if (left === DEFAULT_OUTPUT_CHANNELS[0] && right === DEFAULT_OUTPUT_CHANNELS[1]) {
    return undefined;
  }

  return normalized;
}

export function canPanOutputRoute(outputChannels: number[]): boolean {
  return outputChannels.length >= 2;
}

/** Route a stereo panner's L/R outputs to 1-based device channels. */
export function connectStereoPannerToOutputChannels(
  panner: StereoPannerNode,
  destination: AudioDestinationNode,
  outputChannels: number[],
): void {
  const maxChannel = Math.max(1, destination.maxChannelCount);
  const clamped = outputChannels.map((channel) => clampOutputChannel(channel, maxChannel));
  const left = clamped[0] - 1;
  const pannerOutputs = panner.numberOfOutputs;

  if (clamped.length === 1) {
    panner.connect(destination, 0, left);
    return;
  }

  const right = clamped[1] - 1;
  panner.connect(destination, 0, left);
  if (pannerOutputs > 1) {
    panner.connect(destination, 1, right);
  } else {
    panner.connect(destination, 0, right);
  }
}
