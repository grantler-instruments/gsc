import type { OutputMessage, OutputState } from "../types/output";
import { OUTPUT_CHANNEL_NAME } from "../types/output";

export function createOutputChannel(): BroadcastChannel {
  return new BroadcastChannel(OUTPUT_CHANNEL_NAME);
}

export function postOutputState(channel: BroadcastChannel, payload: OutputState): void {
  const message: OutputMessage = { type: "state", payload };
  channel.postMessage(message);
}

export function postRequestState(channel: BroadcastChannel): void {
  const message: OutputMessage = { type: "request-state" };
  channel.postMessage(message);
}

export function isOutputMessage(data: unknown): data is OutputMessage {
  if (!data || typeof data !== "object") return false;
  const msg = data as OutputMessage;
  return msg.type === "state" || msg.type === "request-state";
}
