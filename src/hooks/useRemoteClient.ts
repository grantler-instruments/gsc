import { useEffect } from "react";
import { connectRemoteClient, disconnectRemoteClient } from "../lib/remote-client";
import { isRemoteClient } from "../platform/remote-mode";
import { useUiStore } from "../stores/ui";

/** Remote client: connect to booth host and stay in show mode. */
export function useRemoteClient(): void {
  useEffect(() => {
    if (!isRemoteClient()) return;

    useUiStore.getState().setShowMode(true);
    connectRemoteClient();

    return () => {
      disconnectRemoteClient();
    };
  }, []);
}
