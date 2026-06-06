import { useCallback, useEffect, useState } from "react";
import { isRunningAsPwa } from "../lib/pwa-install";
import { getPlatform } from "../platform";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  readonly userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

const PWA_DISPLAY_MODES = ["standalone", "minimal-ui", "window-controls-overlay"] as const;

/** Capture the browser install prompt for the web PWA (Chrome, Edge, etc.). */
export function usePwaInstall(): {
  showInstallMenuItem: boolean;
  install: () => Promise<boolean>;
} {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [runningAsPwa, setRunningAsPwa] = useState(isRunningAsPwa);

  useEffect(() => {
    if (getPlatform() !== "web") return;

    const syncRunningAsPwa = () => setRunningAsPwa(isRunningAsPwa());

    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setPromptEvent(event as BeforeInstallPromptEvent);
    };

    const onInstalled = () => {
      setRunningAsPwa(true);
      setPromptEvent(null);
    };

    syncRunningAsPwa();
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);

    const mediaQueries = PWA_DISPLAY_MODES.map((mode) =>
      window.matchMedia(`(display-mode: ${mode})`),
    );
    for (const mq of mediaQueries) {
      mq.addEventListener("change", syncRunningAsPwa);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
      for (const mq of mediaQueries) {
        mq.removeEventListener("change", syncRunningAsPwa);
      }
    };
  }, []);

  const install = useCallback(async () => {
    if (!promptEvent) return false;
    await promptEvent.prompt();
    await promptEvent.userChoice;
    setPromptEvent(null);
    return true;
  }, [promptEvent]);

  return {
    showInstallMenuItem: getPlatform() === "web" && !runningAsPwa,
    install,
  };
}
