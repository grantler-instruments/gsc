import type { OutputMessage, OutputState } from "../types/output";
import { outputChannelName } from "../types/output";

export function createOutputChannel(busId?: string): BroadcastChannel {
  return new BroadcastChannel(outputChannelName(busId));
}

export function postOutputState(channel: BroadcastChannel, payload: OutputState): void {
  const message: OutputMessage = { type: "state", payload };
  channel.postMessage(message);
}

export function postOutputAsset(
  channel: BroadcastChannel,
  projectId: string,
  assetPath: string,
  blob: Blob,
): void {
  const message: OutputMessage = { type: "asset", payload: { projectId, assetPath, blob } };
  channel.postMessage(message);
}

export function postRequestState(channel: BroadcastChannel, busId?: string): void {
  const message: OutputMessage = { type: "request-state", busId };
  channel.postMessage(message);
}

export function isOutputMessage(data: unknown): data is OutputMessage {
  if (!data || typeof data !== "object") return false;
  const msg = data as OutputMessage;
  if (msg.type === "state") return true;
  if (msg.type === "request-state") return true;
  if (msg.type !== "asset") return false;
  const payload = (msg as { payload?: unknown }).payload;
  return (
    !!payload &&
    typeof payload === "object" &&
    typeof (payload as { projectId?: unknown }).projectId === "string" &&
    typeof (payload as { assetPath?: unknown }).assetPath === "string" &&
    (payload as { blob?: unknown }).blob instanceof Blob
  );
}

/** Channels used to publish visual output state and assets. */
export function listOutputPublishChannels(videoBusIds: string[]): BroadcastChannel[] {
  const channels = [createOutputChannel()];
  for (const busId of videoBusIds) {
    channels.push(createOutputChannel(busId));
  }
  return channels;
}

export function closeOutputChannels(channels: BroadcastChannel[]): void {
  for (const channel of channels) {
    channel.close();
  }
}
