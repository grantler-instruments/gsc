export function isIosDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

/** True when GSC is running as an installed PWA, not in a regular browser tab. */
export function isRunningAsPwa(): boolean {
  if (typeof window === "undefined") return false;
  const nav = navigator as Navigator & { standalone?: boolean };

  if (nav.standalone === true) return true;

  const pwaDisplayModes = ["standalone", "minimal-ui", "window-controls-overlay"] as const;
  return pwaDisplayModes.some((mode) => window.matchMedia(`(display-mode: ${mode})`).matches);
}

export function registerPwaServiceWorker(): void {
  if (typeof window === "undefined") return;
  void import("virtual:pwa-register").then(({ registerSW }) => {
    registerSW({ immediate: true });
  });
}
