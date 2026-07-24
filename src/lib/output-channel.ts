import { getPlatform } from "../platform";
import type { OutputMessage, OutputState } from "../types/output";
import { OUTPUT_CHANNEL_NAME } from "../types/output";

/** Tauri inter-window bus — BroadcastChannel is unreliable across WebView2 windows on Windows. */
export const OUTPUT_EVENT_NAME = "gsc://output";

type OutputMessageHandler = (event: { data: unknown }) => void;

export interface OutputChannel {
  postMessage(data: OutputMessage): void;
  onmessage: OutputMessageHandler | null;
  close(): void;
  /** Resolves when the channel can receive (Tauri `listen` ready; sync on web). */
  ready: Promise<void>;
}

function createBroadcastOutputChannel(): OutputChannel {
  const channel = new BroadcastChannel(OUTPUT_CHANNEL_NAME);
  return {
    postMessage: (data) => {
      channel.postMessage(data);
    },
    get onmessage() {
      return channel.onmessage as OutputMessageHandler | null;
    },
    set onmessage(handler) {
      channel.onmessage = handler as BroadcastChannel["onmessage"];
    },
    close: () => {
      channel.close();
    },
    ready: Promise.resolve(),
  };
}

function createTauriOutputChannel(): OutputChannel {
  let handler: OutputMessageHandler | null = null;
  let unlisten: (() => void) | undefined;
  let closed = false;

  let resolveReady!: () => void;
  const ready = new Promise<void>((resolve) => {
    resolveReady = resolve;
  });

  void (async () => {
    try {
      const { listen } = await import("@tauri-apps/api/event");
      if (closed) {
        resolveReady();
        return;
      }
      unlisten = await listen<OutputMessage>(OUTPUT_EVENT_NAME, (event) => {
        handler?.({ data: event.payload });
      });
    } catch (err) {
      console.warn("[output] Failed to subscribe to Tauri output events", err);
    } finally {
      resolveReady();
    }
  })();

  return {
    postMessage(data) {
      if (data.type === "asset") {
        // Blobs cannot cross the Tauri event bus; desktop uses disk mode instead.
        console.warn("[output] Ignoring asset post on Tauri event channel");
        return;
      }
      void import("@tauri-apps/api/event")
        .then(({ emit }) => emit(OUTPUT_EVENT_NAME, data))
        .catch((err) => {
          console.warn("[output] Failed to emit Tauri output event", err);
        });
    },
    get onmessage() {
      return handler;
    },
    set onmessage(next) {
      handler = next;
    },
    close() {
      closed = true;
      unlisten?.();
      unlisten = undefined;
      handler = null;
    },
    ready,
  };
}

export function createOutputChannel(): OutputChannel {
  return getPlatform() === "tauri" ? createTauriOutputChannel() : createBroadcastOutputChannel();
}

export function postOutputState(channel: OutputChannel, payload: OutputState): void {
  const message: OutputMessage = { type: "state", payload };
  channel.postMessage(message);
}

export function postOutputAsset(
  channel: OutputChannel,
  projectId: string,
  assetPath: string,
  blob: Blob,
): void {
  const message: OutputMessage = { type: "asset", payload: { projectId, assetPath, blob } };
  channel.postMessage(message);
}

export function postRequestState(channel: OutputChannel): void {
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
