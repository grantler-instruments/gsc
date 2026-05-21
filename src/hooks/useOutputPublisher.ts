import { useEffect, useRef } from "react";
import { cacheAsset } from "../lib/asset-cache";
import { buildOutputState } from "../lib/output-state";
import {
  createOutputChannel,
  isOutputMessage,
  postOutputState,
} from "../lib/output-channel";
import { useProjectStore } from "../stores/project";
import { useTransportStore } from "../stores/transport";
import { usePlaybackStore } from "../stores/playback";
import { useFadeStore } from "../stores/fade";
import { vfsGet } from "../vfs/engine";

/** Publishes visual output state to the output window via BroadcastChannel. */
export function useOutputPublisher(): void {
  const channelRef = useRef<BroadcastChannel | null>(null);
  const revisionRef = useRef(0);

  useEffect(() => {
    const channel = createOutputChannel();
    channelRef.current = channel;

    const publish = () => {
      void (async () => {
        revisionRef.current += 1;
        const state = buildOutputState(revisionRef.current);

        await Promise.all(
          state.layers.map(async (layer) => {
            const blob = vfsGet(layer.assetPath);
            if (blob) {
              await cacheAsset(layer.assetPath, blob);
            }
          }),
        );

        postOutputState(channel, state);
      })();
    };

    channel.onmessage = (event: MessageEvent) => {
      if (!isOutputMessage(event.data)) return;
      if (event.data.type === "request-state") {
        publish();
      }
    };

    publish();

    const unsubTransport = useTransportStore.subscribe(publish);

    let prevProgressKeys = "";
    const unsubPlayback = usePlaybackStore.subscribe((s) => {
      const keys = Object.keys(s.byCueId).sort().join(",");
      if (keys !== prevProgressKeys) {
        prevProgressKeys = keys;
        publish();
      }
    });

    let prevFrameMs = 0;
    const unsubFade = useFadeStore.subscribe((s) => {
      if (Object.keys(s.fadesByTargetId).length === 0) return;
      if (s.frameMs !== prevFrameMs) {
        prevFrameMs = s.frameMs;
        publish();
      }
    });

    const unsubProject = useProjectStore.subscribe((s, prev) => {
      const list =
        s.cueLists.find((l) => l.id === s.activeCueListId) ?? s.cueLists[0];
      const prevList =
        prev.cueLists.find((l) => l.id === prev.activeCueListId) ??
        prev.cueLists[0];
      if (list?.cues !== prevList?.cues) {
        publish();
      }
    });

    return () => {
      unsubTransport();
      unsubPlayback();
      unsubFade();
      unsubProject();
      channel.close();
      channelRef.current = null;
    };
  }, []);
}
