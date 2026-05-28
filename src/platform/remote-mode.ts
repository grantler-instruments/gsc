/** True when this window is a phone/tablet remote client (not the booth host). */
export function isRemoteClient(): boolean {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("mode") === "remote";
}

const REMOTE_PIN_SESSION_KEY = "gsc-remote-pin";
const REMOTE_DEV_UI_PORT = "1421";
const REMOTE_DEFAULT_SERVER_PORT = "8766";

function readPinFromSession(): string | null {
  if (typeof window === "undefined") return null;
  const pin = window.sessionStorage.getItem(REMOTE_PIN_SESSION_KEY)?.trim();
  return /^\d{6}$/.test(pin ?? "") ? pin! : null;
}

function writePinToSession(pin: string): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(REMOTE_PIN_SESSION_KEY, pin);
}

export function remotePinFromUrl(): string | null {
  if (typeof window === "undefined") return null;
  const pin = new URLSearchParams(window.location.search).get("pin")?.trim();
  if (pin && /^\d{6}$/.test(pin)) {
    writePinToSession(pin);
    return pin;
  }
  return readPinFromSession();
}

/** Save remote PIN for this tab/session and inject it into the URL. */
export function setRemotePinForSession(pin: string): void {
  if (typeof window === "undefined") return;
  const normalized = pin.trim();
  if (!/^\d{6}$/.test(normalized)) return;
  writePinToSession(normalized);
  const url = new URL(window.location.href);
  url.searchParams.set("pin", normalized);
  window.history.replaceState(null, "", url.toString());
}

export function remoteWebSocketUrl(): string {
  const params = new URLSearchParams(window.location.search);
  const wsPort = params.get("wsPort")?.trim();
  const port =
    wsPort ||
    (isRemoteClient() && window.location.port === REMOTE_DEV_UI_PORT
      ? REMOTE_DEFAULT_SERVER_PORT
      : "");
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const hostname = window.location.hostname;
  if (port) {
    return `${protocol}//${hostname}:${port}/ws`;
  }
  return `${protocol}//${window.location.host}/ws`;
}
