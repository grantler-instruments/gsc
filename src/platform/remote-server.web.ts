import type { RemoteServerInfo, RemoteServerStatus } from "../types/remote";

export async function getLocalIp(): Promise<string> {
  return "127.0.0.1";
}

export async function getRemoteServerStatus(): Promise<RemoteServerStatus> {
  return {
    running: false,
    port: 8766,
    pin: "",
    lanIp: "",
    connectUrl: "",
    clientCount: 0,
    devMode: false,
  };
}

export async function startRemoteServer(_port: number, _pin?: string): Promise<RemoteServerInfo> {
  throw new Error("Remote control requires the desktop app.");
}

export async function stopRemoteServer(): Promise<void> {}

export async function remoteBroadcast(_message: string): Promise<void> {}
