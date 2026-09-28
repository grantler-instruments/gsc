import { useEffect } from "react";
import { startMemoryManager } from "../audio/memory-manager";
import { getPlatform } from "../platform";
import { isRemoteClient } from "../platform/remote-mode";
import { useProjectStore } from "../stores/project";
import { useTransportStore } from "../stores/transport";

export function useMediaMemoryManager(ready: boolean): void {
  useEffect(() => {
    if (!ready || isRemoteClient() || getPlatform() !== "tauri") return;
    return startMemoryManager({
      pollPressure: true,
      getProtection: () => ({
        cueLists: useProjectStore.getState().cueLists,
        activeCueIds: useTransportStore.getState().activeCueIds,
        runningSequences: useTransportStore.getState().runningSequences,
      }),
      subscribe: (listener) => {
        const project = useProjectStore.subscribe(listener);
        const transport = useTransportStore.subscribe(listener);
        return () => {
          project();
          transport();
        };
      },
    });
  }, [ready]);
}
