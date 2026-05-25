import type { OutputMessage, OutputState } from "../types/output";
import { OUTPUT_CHANNEL_NAME } from "../types/output";

export function createOutputChannel(): BroadcastChannel {
  return new BroadcastChannel(OUTPUT_CHANNEL_NAME);
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

export function postRequestState(channel: BroadcastChannel): void {
  const message: OutputMessage = { type: "request-state" };
  channel.postMessage(message);
}

export function isOutputMessage(data: unknown): data is OutputMessage {
  if (!data || typeof data !== "object") return false;
  const msg = data as OutputMessage;
  if (msg.type === "state" || msg.type === "request-state") return true;
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
