import { invoke } from "@tauri-apps/api/core";
import type { RemoteServerInfo, RemoteServerStatus } from "../types/remote";

export async function getLocalIp(): Promise<string> {
  return invoke<string>("get_local_ip");
}

export async function getRemoteServerStatus(): Promise<RemoteServerStatus> {
  return invoke<RemoteServerStatus>("get_remote_server_status");
}

export async function startRemoteServer(port: number): Promise<RemoteServerInfo> {
  return invoke<RemoteServerInfo>("start_remote_server", { port });
}

export async function stopRemoteServer(): Promise<void> {
  await invoke("stop_remote_server");
}

export async function remoteBroadcast(message: string): Promise<void> {
  await invoke("remote_broadcast", { message });
}

/** Tell the remote HTTP server where project assets live on disk. */
export async function setRemoteProjectRoot(rootDir: string | null): Promise<void> {
  await invoke("remote_set_project_root", { rootDir });
}
