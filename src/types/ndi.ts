/** Master switch for experimental NDI output (desktop only). */
export const NDI_ENABLED = false;

export interface NdiSourceInfo {
  name: string;
  urlAddress: string;
}

export interface NdiOutputStatus {
  running: boolean;
  available: boolean;
  sourceName: string;
  width: number;
  height: number;
  fps: number;
  framesSent: number;
  connectionCount: number;
  lastError: string | null;
}

export interface NdiOutputConfig {
  sourceName: string;
  windowTitle?: string;
  width: number;
  height: number;
  fps: number;
}

export const DEFAULT_NDI_SOURCE_NAME = "Grantler Stage Control";
export const DEFAULT_NDI_OUTPUT_WIDTH = 1280;
export const DEFAULT_NDI_OUTPUT_HEIGHT = 720;
export const DEFAULT_NDI_OUTPUT_FPS = 30;

export const NDI_OUTPUT_STOPPED: NdiOutputStatus = {
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
