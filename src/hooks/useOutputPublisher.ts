import { useEffect, useRef } from "react";
import { cacheAsset } from "../lib/asset-cache";
import {
  closeOutputChannels,
  isOutputMessage,
  listOutputPublishChannels,
  postOutputAsset,
  postOutputState,
} from "../lib/output-channel";
import { buildOutputState } from "../lib/output-state";
import { resolveAssetBlob } from "../platform/vfs-asset";
import { useFadeStore } from "../stores/fade";
import { usePlaybackStore } from "../stores/playback";
import { useProjectStore } from "../stores/project";
import { useTransportStore } from "../stores/transport";

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
  return prev.activeCueIds !== next.activeCueIds || prev.cueStartedAtMs !== next.cueStartedAtMs;
}

async function publishAssets(
  channels: BroadcastChannel[],
  projectId: string,
  assetPaths: string[],
): Promise<void> {
  await Promise.all(
    assetPaths.map(async (assetPath) => {
      const blob = await resolveAssetBlob(assetPath);
      if (!blob) return;
      await cacheAsset(projectId, assetPath, blob);
      for (const channel of channels) {
        postOutputAsset(channel, projectId, assetPath, blob);
      }
    }),
  );
}

/** Publishes visual output state to output windows via BroadcastChannel. */
export function useOutputPublisher(): void {
  const channelsRef = useRef<BroadcastChannel[]>([]);
  const revisionRef = useRef(0);

  useEffect(() => {
    const syncChannels = () => {
      closeOutputChannels(channelsRef.current);
      channelsRef.current = listOutputPublishChannels(
        useProjectStore.getState().videoBuses.map((bus) => bus.id),
      );
      return channelsRef.current;
    };

    let channels = syncChannels();

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
          const revision = revisionRef.current;
          const videoBuses = useProjectStore.getState().videoBuses;
          const targets: Array<string | undefined> = [
            undefined,
            ...videoBuses.map((bus) => bus.id),
          ];

          const states = await Promise.all(
            targets.map((busId) => buildOutputState(revision, busId)),
          );

          const assetPaths = [
            ...new Set(states.flatMap((state) => state.layers.map((l) => l.assetPath))),
          ];
          if (assetPaths.length > 0) {
            await publishAssets(channels, states[0]?.projectId ?? "", assetPaths);
          }

          for (let index = 0; index < states.length; index++) {
            const channel = channels[index];
            const state = states[index];
            if (channel && state) {
              postOutputState(channel, state);
            }
          }
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

    const attachChannelHandlers = () => {
      for (const channel of channels) {
        channel.onmessage = (event: MessageEvent) => {
          if (!isOutputMessage(event.data)) return;
          if (event.data.type === "request-state") {
            schedulePublish();
          }
        };
      }
    };

    attachChannelHandlers();
    schedulePublish();

    const unsubTransport = useTransportStore.subscribe((state, prev) => {
      if (
        outputTransportChanged(selectOutputTransportState(prev), selectOutputTransportState(state))
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
    let hadActiveFades = false;
    const unsubFade = useFadeStore.subscribe((s) => {
      const hasActiveFades = Object.keys(s.fadesByTargetId).length > 0;
      if (!hasActiveFades && !hadActiveFades) return;
      if (s.frameMs === prevFrameMs) return;
      prevFrameMs = s.frameMs;
      hadActiveFades = hasActiveFades;
      schedulePublish();
    });

    const unsubProject = useProjectStore.subscribe((s, prev) => {
      if (
        s.cueLists !== prev.cueLists ||
        s.activeCueListId !== prev.activeCueListId ||
        s.masterVideoOutputName !== prev.masterVideoOutputName ||
        s.videoBuses !== prev.videoBuses
      ) {
        if (s.videoBuses !== prev.videoBuses) {
          channels = syncChannels();
          attachChannelHandlers();
        }
        schedulePublish();
      }
    });

    return () => {
      if (rafId !== 0) cancelAnimationFrame(rafId);
      unsubTransport();
      unsubPlayback();
      unsubFade();
      unsubProject();
      closeOutputChannels(channelsRef.current);
      channelsRef.current = [];
    };
  }, []);
}
