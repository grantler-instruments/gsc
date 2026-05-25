import { useEffect } from "react";
import { storeOutputAssetBlob } from "../lib/output-asset-bridge";
import { createOutputChannel, isOutputMessage } from "../lib/output-channel";

/** Receives asset blobs pushed from the control window over BroadcastChannel. */
export function useOutputAssetReceiver(): void {
  useEffect(() => {
    const channel = createOutputChannel();

    channel.onmessage = (event: MessageEvent) => {
      if (!isOutputMessage(event.data)) return;
      if (event.data.type !== "asset") return;
      const { projectId, assetPath, blob } = event.data.payload;
      storeOutputAssetBlob(projectId, assetPath, blob);
    };

    return () => {
      channel.close();
    };
  }, []);
}
