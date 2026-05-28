import { isRemoteClient, remotePinFromUrl, remoteWebSocketUrl } from "../platform/remote-mode";
import type { RemoteCommandAction, RemoteServerMessage, RemoteSnapshot } from "../types/remote";
import { remoteCommandToWirePayload } from "./remote-command";
import { applyRemoteSnapshot } from "./remote-snapshot";

type ConnectionState = "disconnected" | "connecting" | "connected" | "auth-failed";

let socket: WebSocket | null = null;
let connectionState: ConnectionState = "disconnected";
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
const listeners = new Set<(state: ConnectionState) => void>();

function setConnectionState(state: ConnectionState): void {
  connectionState = state;
  for (const listener of listeners) {
    listener(state);
  }
}

export function subscribeRemoteConnection(listener: (state: ConnectionState) => void): () => void {
  listeners.add(listener);
  listener(connectionState);
  return () => {
    listeners.delete(listener);
  };
}

export function getRemoteConnectionState(): ConnectionState {
  return connectionState;
}

function scheduleReconnect(): void {
  if (!isRemoteClient()) return;
  if (reconnectTimer !== null) return;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    connectRemoteClient();
  }, 2000);
}

function parseServerMessage(raw: unknown): RemoteServerMessage | null {
  try {
    return JSON.parse(String(raw)) as RemoteServerMessage;
  } catch {
    return null;
  }
}

function handleSnapshot(snapshot: RemoteSnapshot): void {
  try {
    applyRemoteSnapshot(snapshot);
  } catch (err) {
    console.error("[remote] apply snapshot failed", err, snapshot);
  }
}

function isRemoteSnapshot(value: unknown): value is RemoteSnapshot {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<RemoteSnapshot>;
  return (
    typeof candidate.project === "object" &&
    Array.isArray(candidate.selectedCueIds) &&
    typeof candidate.transport === "object" &&
    typeof candidate.playback === "object"
  );
}

function handleServerMessage(message: RemoteServerMessage): void {
  if (message.type === "authOk") {
    setConnectionState("connected");
    socket?.send(JSON.stringify({ type: "request-sync" }));
    return;
  }
  if (message.type === "authFail") {
    setConnectionState("auth-failed");
    socket?.close();
    return;
  }
  if (message.type === "snapshot" && isRemoteSnapshot(message.payload)) {
    handleSnapshot(message.payload);
  }
}

export function connectRemoteClient(): void {
  if (!isRemoteClient()) return;
  if (
    socket &&
    (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)
  ) {
    return;
  }

  const pin = remotePinFromUrl();
  if (!pin) {
    setConnectionState("disconnected");
    return;
  }

  setConnectionState("connecting");
  socket = new WebSocket(remoteWebSocketUrl());

  socket.addEventListener("open", () => {
    socket?.send(JSON.stringify({ type: "auth", pin }));
  });

  socket.addEventListener("message", (event) => {
    const message = parseServerMessage(event.data);
    if (!message) return;
    handleServerMessage(message);
  });

  socket.addEventListener("close", () => {
    socket = null;
    if (connectionState !== "auth-failed") {
      setConnectionState("disconnected");
      scheduleReconnect();
    }
  });

  socket.addEventListener("error", () => {
    socket?.close();
  });
}

export function disconnectRemoteClient(): void {
  if (reconnectTimer !== null) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  socket?.close();
  socket = null;
  setConnectionState("disconnected");
}

export function sendRemoteCommand(action: RemoteCommandAction): void {
  if (!isRemoteClient() || !socket || socket.readyState !== WebSocket.OPEN) return;
  socket.send(JSON.stringify({ type: "cmd", ...remoteCommandToWirePayload(action) }));
}

export function sendRemoteMasterVolume(value: number): void {
  sendRemoteCommand({ action: "set-master-volume", value });
}
