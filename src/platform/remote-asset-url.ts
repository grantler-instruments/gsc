import { normalizePath } from "../vfs/engine";
import { isRemoteClient, remotePinFromUrl } from "./remote-mode";

const REMOTE_DEV_UI_PORT = "1421";
const REMOTE_DEFAULT_SERVER_PORT = "8766";

/** HTTP origin for booth remote server (WebSocket + assets). */
export function remoteHttpOrigin(): string {
  if (typeof window === "undefined") return "";
  const params = new URLSearchParams(window.location.search);
  const remotePort = params.get("wsPort")?.trim();
  const port =
    remotePort ||
    (isRemoteClient() && window.location.port === REMOTE_DEV_UI_PORT
      ? REMOTE_DEFAULT_SERVER_PORT
      : "");
  const protocol = window.location.protocol;
  const hostname = window.location.hostname;
  if (port) {
    return `${protocol}//${hostname}:${port}`;
  }
  return `${protocol}//${window.location.host}`;
}

/** Full URL to fetch a project asset from the booth over HTTP (PIN auth). */
export function buildRemoteAssetUrl(assetPath: string): string {
  const path = normalizePath(assetPath);
  const pin = remotePinFromUrl();
  const url = new URL("/remote/asset", remoteHttpOrigin());
  url.searchParams.set("path", path);
  if (pin) url.searchParams.set("pin", pin);
  return url.toString();
}

export function canFetchRemoteAssets(): boolean {
  return isRemoteClient() && Boolean(remotePinFromUrl());
}
