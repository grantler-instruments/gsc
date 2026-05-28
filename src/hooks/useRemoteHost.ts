import { listen } from "@tauri-apps/api/event";
import { useEffect, useRef } from "react";
import { registerHostSelectionBroadcaster } from "../lib/host-selection-bridge";
import { broadcastRemoteSnapshot, handleRemoteHostCommand } from "../lib/remote-host";
import { getPlatform } from "../platform";
import {
  getRemoteServerStatus,
  setRemoteProjectRoot,
  startRemoteServer,
} from "../platform/remote-server";
import { useDmxOutputStore } from "../stores/dmx-output";
import { useFadeStore } from "../stores/fade";
import { usePlaybackStore } from "../stores/playback";
import { usePreferencesStore } from "../stores/preferences";
import { getActiveCueListFromState, useProjectStore } from "../stores/project";
import { useProjectLocationStore } from "../stores/project-location";
import { useTransportStore } from "../stores/transport";
import { useUiStore } from "../stores/ui";
import type { RemoteHostCommand } from "../types/remote";

const BROADCAST_DEBOUNCE_MS = 80;

function isCueCountChanged(
  state: ReturnType<typeof useProjectStore.getState>,
  prev: ReturnType<typeof useProjectStore.getState>,
): boolean {
  return (
    getActiveCueListFromState(state).cues.length !== getActiveCueListFromState(prev).cues.length
  );
}

function isRelevantUiChange(
  state: ReturnType<typeof useUiStore.getState>,
  prev: ReturnType<typeof useUiStore.getState>,
): boolean {
  return (
    state.dmxPreviewCueIds !== prev.dmxPreviewCueIds ||
    state.fixturePlotExpanded !== prev.fixturePlotExpanded
  );
}

/** Host-side: relay store changes to remote clients and handle incoming commands. */
export function useRemoteHost(sessionReady: boolean): void {
  const broadcastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoStartAttempted = useRef(false);

  useEffect(() => {
    if (!sessionReady || getPlatform() !== "tauri") return;

    const syncProjectRoot = () => {
      void setRemoteProjectRoot(useProjectLocationStore.getState().rootDir);
    };
    syncProjectRoot();
    const unsubRoot = useProjectLocationStore.subscribe(syncProjectRoot);

    const pushSnapshot = () => {
      void broadcastRemoteSnapshot();
    };

    void (async () => {
      const status = await getRemoteServerStatus();
      if (status.running) {
        pushSnapshot();
        return;
      }
      if (autoStartAttempted.current) {
        return;
      }
      autoStartAttempted.current = true;

      const prefs = usePreferencesStore.getState();
      if (!prefs.remoteAutoStart) return;
      const preferredPin = /^\d{6}$/.test(prefs.remotePin) ? prefs.remotePin : undefined;
      try {
        const info = await startRemoteServer(prefs.remotePort, preferredPin);
        if (info.pin !== prefs.remotePin) {
          usePreferencesStore.getState().setRemotePin(info.pin);
        }
        pushSnapshot();
      } catch (err) {
        console.warn("[remote] auto-start failed", err);
      }
    })();

    const scheduleBroadcast = () => {
      if (broadcastTimer.current !== null) {
        clearTimeout(broadcastTimer.current);
      }
      broadcastTimer.current = setTimeout(() => {
        broadcastTimer.current = null;
        pushSnapshot();
      }, BROADCAST_DEBOUNCE_MS);
    };

    const unregisterSelectionBroadcaster = registerHostSelectionBroadcaster(pushSnapshot);

    const unlistenCommand = listen<RemoteHostCommand>("remote://command", (event) => {
      handleRemoteHostCommand(event.payload);
    });
    const unlistenConnected = listen("remote://client-connected", pushSnapshot);
    const unlistenSyncRequest = listen("remote://sync-request", pushSnapshot);

    const unsubCues = useProjectStore.subscribe((state, prev) => {
      if (isCueCountChanged(state, prev)) pushSnapshot();
    });

    const unsubs = [
      useTransportStore.subscribe(scheduleBroadcast),
      useProjectStore.subscribe(scheduleBroadcast),
      usePlaybackStore.subscribe(scheduleBroadcast),
      useUiStore.subscribe((state, prev) => {
        if (isRelevantUiChange(state, prev)) scheduleBroadcast();
      }),
      useDmxOutputStore.subscribe(scheduleBroadcast),
      useFadeStore.subscribe(scheduleBroadcast),
      unsubCues,
    ];

    return () => {
      unsubRoot();
      void setRemoteProjectRoot(null);
      unregisterSelectionBroadcaster();
      void unlistenCommand.then((unlisten) => unlisten());
      void unlistenConnected.then((unlisten) => unlisten());
      void unlistenSyncRequest.then((unlisten) => unlisten());
      for (const unsub of unsubs) unsub();
      if (broadcastTimer.current !== null) {
        clearTimeout(broadcastTimer.current);
      }
    };
  }, [sessionReady]);
}
