import { useEffect, useRef } from "react";
import { cacheAsset } from "../lib/asset-cache";
import { buildOutputState } from "../lib/output-state";
import {
  createOutputChannel,
  isOutputMessage,
  postOutputState,
} from "../lib/output-channel";
import { getActiveCueListFromState, useProjectStore } from "../stores/project";
import { useTransportStore } from "../stores/transport";
import { usePlaybackStore } from "../stores/playback";
import { useFadeStore } from "../stores/fade";
import { resolveAssetBlob } from "../platform/vfs-asset";

const selectOutputTransportState = (s: {
  activeCueIds: string[];
  cueStartedAtMs: Record<string, number>;
}) => ({
  activeCueIds: s.activeCueIds,
  cueStartedAtMs: s.cueStartedAtMs,
});

function outputTransportChanged(
  prev: ReturnType<typeof selectOutputTransportState>,
  next: ReturnType<typeof selectOutputTransportState>,
): boolean {
  return (
    prev.activeCueIds !== next.activeCueIds ||
    prev.cueStartedAtMs !== next.cueStartedAtMs
  );
}

/** Publishes visual output state to the output window via BroadcastChannel. */
export function useOutputPublisher(): void {
  const channelRef = useRef<BroadcastChannel | null>(null);
  const revisionRef = useRef(0);

  useEffect(() => {
    const channel = createOutputChannel();
    channelRef.current = channel;

    let rafId = 0;
    let inFlight = false;
    let pending = false;

    const runPublish = () => {
      if (inFlight) {
        pending = true;
        return;
      }
      inFlight = true;

      void (async () => {
        try {
          revisionRef.current += 1;
          const state = await buildOutputState(revisionRef.current);

          await Promise.all(
            state.layers.map(async (layer) => {
              const blob = await resolveAssetBlob(layer.assetPath);
              if (blob) {
                await cacheAsset(state.projectId, layer.assetPath, blob);
              }
            }),
          );

          postOutputState(channel, state);
        } finally {
          inFlight = false;
          if (pending) {
            pending = false;
            runPublish();
          }
        }
      })();
    };

    const schedulePublish = () => {
      if (rafId !== 0) return;
      rafId = requestAnimationFrame(() => {
        rafId = 0;
        runPublish();
      });
    };

    channel.onmessage = (event: MessageEvent) => {
      if (!isOutputMessage(event.data)) return;
      if (event.data.type === "request-state") {
        schedulePublish();
      }
    };

    schedulePublish();

    const unsubTransport = useTransportStore.subscribe((state, prev) => {
      if (
        outputTransportChanged(
          selectOutputTransportState(prev),
          selectOutputTransportState(state),
        )
      ) {
        schedulePublish();
      }
    });

    let prevProgressKeys = "";
    const unsubPlayback = usePlaybackStore.subscribe((s) => {
      const keys = Object.keys(s.byCueId).sort().join(",");
      if (keys !== prevProgressKeys) {
        prevProgressKeys = keys;
        schedulePublish();
      }
    });

    let prevFrameMs = 0;
    const unsubFade = useFadeStore.subscribe((s) => {
      if (Object.keys(s.fadesByTargetId).length === 0) return;
      if (s.frameMs !== prevFrameMs) {
        prevFrameMs = s.frameMs;
        schedulePublish();
      }
    });

    const unsubProject = useProjectStore.subscribe((s, prev) => {
      const list = getActiveCueListFromState(s);
      const prevList = getActiveCueListFromState(prev);
      if (list?.cues !== prevList?.cues) {
        schedulePublish();
      }
    });

    return () => {
      if (rafId !== 0) cancelAnimationFrame(rafId);
      unsubTransport();
      unsubPlayback();
      unsubFade();
      unsubProject();
      channel.close();
      channelRef.current = null;
    };
  }, []);
}
