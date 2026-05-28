import type { RemoteServerInfo, RemoteServerStatus } from "../types/remote";
import { getPlatform } from "./index";

export async function getLocalIp(): Promise<string> {
  if (getPlatform() !== "tauri") {
    const { getLocalIp: get } = await import("./remote-server.web");
    return get();
  }
  const { getLocalIp: get } = await import("./remote-server.tauri");
  return get();
}

export async function getRemoteServerStatus(): Promise<RemoteServerStatus> {
  if (getPlatform() !== "tauri") {
    const { getRemoteServerStatus: get } = await import("./remote-server.web");
    return get();
  }
  const { getRemoteServerStatus: get } = await import("./remote-server.tauri");
  return get();
}

export async function startRemoteServer(port: number): Promise<RemoteServerInfo> {
  if (getPlatform() !== "tauri") {
    const { startRemoteServer: start } = await import("./remote-server.web");
    return start(port);
  }
  const { startRemoteServer: start } = await import("./remote-server.tauri");
  return start(port);
}

export async function stopRemoteServer(): Promise<void> {
  if (getPlatform() !== "tauri") {
    const { stopRemoteServer: stop } = await import("./remote-server.web");
    return stop();
  }
  const { stopRemoteServer: stop } = await import("./remote-server.tauri");
  return stop();
}

export async function remoteBroadcast(message: string): Promise<void> {
  if (getPlatform() !== "tauri") {
    const { remoteBroadcast: broadcast } = await import("./remote-server.web");
    return broadcast(message);
  }
  const { remoteBroadcast: broadcast } = await import("./remote-server.tauri");
  return broadcast(message);
}

export async function setRemoteProjectRoot(rootDir: string | null): Promise<void> {
  if (getPlatform() !== "tauri") return;
  const { setRemoteProjectRoot: set } = await import("./remote-server.tauri");
  return set(rootDir);
}
