/** True when this window is a phone/tablet remote client (not the booth host). */
export function isRemoteClient(): boolean {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("mode") === "remote";
}

export function remotePinFromUrl(): string | null {
  if (typeof window === "undefined") return null;
  const pin = new URLSearchParams(window.location.search).get("pin")?.trim();
  return pin || null;
}

export function remoteWebSocketUrl(): string {
  const params = new URLSearchParams(window.location.search);
  const wsPort = params.get("wsPort")?.trim();
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const hostname = window.location.hostname;
  if (wsPort) {
    return `${protocol}//${hostname}:${wsPort}/ws`;
  }
  return `${protocol}//${window.location.host}/ws`;
}
