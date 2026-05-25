import type { NdiOutputConfig, NdiOutputStatus, NdiSourceInfo } from "../types/ndi";

export async function ndiIsAvailable(): Promise<boolean> {
  return false;
}

export async function listNdiSources(_timeoutMs = 2000): Promise<NdiSourceInfo[]> {
  return [];
}

export async function startNdiOutput(_config: NdiOutputConfig): Promise<void> {
  throw new Error("NDI output requires the desktop app.");
}

export async function stopNdiOutput(): Promise<void> {}

export async function getNdiOutputStatus(): Promise<NdiOutputStatus> {
  return {
    running: false,
    available: false,
    sourceName: "",
    width: 0,
    height: 0,
    fps: 0,
    framesSent: 0,
    connectionCount: 0,
    lastError: null,
  };
}

export async function pushNdiFrame(
  _width: number,
  _height: number,
  _data: Uint8Array,
): Promise<void> {}
