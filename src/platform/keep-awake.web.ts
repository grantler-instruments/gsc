let wakeLock: WakeLockSentinel | null = null;
let wantAwake = false;

async function releaseWakeLock(): Promise<void> {
  if (!wakeLock) return;
  try {
    await wakeLock.release();
  } catch {
    // Already released (e.g. tab hidden).
  }
  wakeLock = null;
}

async function acquireWakeLock(): Promise<void> {
  if (!wantAwake || wakeLock || !("wakeLock" in navigator)) return;
  try {
    wakeLock = await navigator.wakeLock.request("screen");
    wakeLock.addEventListener("release", () => {
      wakeLock = null;
    });
  } catch {
    // Permission denied or unsupported in this context.
  }
}

function onVisibilityChange(): void {
  if (document.visibilityState === "visible") {
    void acquireWakeLock();
  }
}

/** Keep the display awake while enabled (browser only). */
export async function setKeepAwake(enabled: boolean): Promise<void> {
  wantAwake = enabled;

  if (enabled) {
    document.addEventListener("visibilitychange", onVisibilityChange);
    await acquireWakeLock();
    return;
  }

  document.removeEventListener("visibilitychange", onVisibilityChange);
  await releaseWakeLock();
}
