import { useEffect } from "react";
import { connectEnttecPro, disconnectEnttecPro } from "../platform/enttec-pro";
import { getPlatform } from "../platform";
import { usePreferencesStore } from "../stores/preferences";

/** Keeps the Enttec Pro serial connection aligned with settings (desktop only). */
export function useEnttecProConnection(): void {
  const backend = usePreferencesStore((s) => s.dmxOutputBackend);
  const portId = usePreferencesStore((s) => s.enttecProPortId);

  useEffect(() => {
    if (getPlatform() !== "tauri") return;

    let cancelled = false;

    void (async () => {
      if (backend !== "enttec-pro" || !portId) {
        await disconnectEnttecPro();
        return;
      }

      const connected = await connectEnttecPro(portId);
      if (cancelled || !connected) {
        await disconnectEnttecPro();
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [backend, portId]);
}
