import { useEffect } from "react";
import { getPlatform } from "../platform";
import { connectEnttecPro, disconnectEnttecPro } from "../platform/enttec-pro";
import { isSerialDmxBackend, usePreferencesStore } from "../stores/preferences";

/** Keeps the Enttec Pro serial connection aligned with settings (desktop only). */
export function useEnttecProConnection(): void {
  const backend = usePreferencesStore((s) => s.dmxOutputBackend);
  const portId = usePreferencesStore((s) => s.enttecProPortId);

  useEffect(() => {
    if (getPlatform() !== "tauri") return;

    let cancelled = false;

    void (async () => {
      if (!isSerialDmxBackend(backend) || !portId) {
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
