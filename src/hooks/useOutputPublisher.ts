import { useEffect, useRef } from "react";
import { cacheAsset } from "../lib/asset-cache";
import {
  createOutputChannel,
  isOutputMessage,
  postOutputAsset,
  postOutputState,
} from "../lib/output-channel";
import { outputAssetKey, outputStatesEqual } from "../lib/output-layer-sync";
import {
  isDiskAssetMode as isDiskAssetModeForPlatform,
  publishOptionsForActiveCueChange,
  publishOptionsForRequestState,
  shouldClearPostedAssetsOnRequestState,
  shouldPostAssetOverChannel,
  shouldPostCachedAssetOverChannel,
} from "../lib/output-publish-policy";
import { buildOutputState, shouldDeferEmptyOutputPublish } from "../lib/output-state";
import { getPlatform } from "../platform";
import { resolveAssetBlob } from "../platform/vfs-asset";
import { useFadeStore } from "../stores/fade";
import { usePlaybackStore } from "../stores/playback";
import { getActiveCueListFromState, useProjectStore } from "../stores/project";
import { useProjectLocationStore } from "../stores/project-location";
import { useTransportStore } from "../stores/transport";
import type { OutputState } from "../types/output";

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

function outputActiveCueIdsChanged(
  prev: ReturnType<typeof selectOutputTransportState>,
  next: ReturnType<typeof selectOutputTransportState>,
): boolean {
  return prev.activeCueIds !== next.activeCueIds;
}

function isDiskAssetMode(): boolean {
  return isDiskAssetModeForPlatform(getPlatform(), useProjectLocationStore.getState().rootDir);
}

function outputStateKey(outputId: string): string {
  return outputId;
}

interface PublishOptions {
  forceAssets?: boolean;
  forceState?: boolean;
}

/** Publishes visual output state to output windows (BroadcastChannel on web, Tauri events on desktop). */
export function useOutputPublisher(): void {
  const channelRef = useRef<ReturnType<typeof createOutputChannel> | null>(null);
  const revisionRef = useRef(0);
  const postedAssetsRef = useRef(new Set<string>());
  const lastStateByOutputRef = useRef(new Map<string, OutputState>());

  useEffect(() => {
    const channel = createOutputChannel();
    channelRef.current = channel;
    let disposed = false;

    let rafId = 0;
    let retryTimeoutId = 0;
    let inFlight = false;
    let pending = false;
    let pendingOptions: PublishOptions | undefined;

    let forceAssetsNext = false;
    let forceStateNext = false;
    let deferAttempts = 0;
    const maxDeferAttempts = 20;

    const getTargets = (): string[] => {
      return useProjectStore.getState().videoOutputs.map((output) => output.id);
    };

    const schedulePublish = (options?: PublishOptions) => {
      if (disposed) return;
      if (options?.forceAssets) {
        forceAssetsNext = true;
      }
      if (options?.forceState) {
        forceStateNext = true;
      }
      if (rafId !== 0) return;
      rafId = requestAnimationFrame(() => {
        rafId = 0;
        runPublish(options);
      });
    };

    const publishStateToChannel = async (
      state: OutputState,
      forceAssets: boolean,
      forceState: boolean,
    ) => {
      const key = outputStateKey(state.outputId);
      const prevState = lastStateByOutputRef.current.get(key) ?? null;
      const stateUnchanged = prevState !== null && outputStatesEqual(prevState, state);
      const diskAssetMode = isDiskAssetMode();

      if (stateUnchanged && !forceAssets && !forceState) {
        return;
      }

      if (shouldPostAssetOverChannel(diskAssetMode, getPlatform())) {
        await Promise.all(
          state.layers.map(async (layer) => {
            const blob = await resolveAssetBlob(layer.assetPath);
            if (!blob) return;

            const assetKey = outputAssetKey(state.projectId, layer.assetPath);
            await cacheAsset(state.projectId, layer.assetPath, blob);
            const alreadyPosted = postedAssetsRef.current.has(assetKey);
            if (!shouldPostCachedAssetOverChannel(alreadyPosted, forceAssets)) {
              return;
            }

            postOutputAsset(channel, state.projectId, layer.assetPath, blob);
            postedAssetsRef.current.add(assetKey);
          }),
        );
      } else if (getPlatform() === "tauri" && state.layers.length > 0) {
        for (const layer of state.layers) {
          const blob = await resolveAssetBlob(layer.assetPath);
          if (!blob) continue;
          await cacheAsset(state.projectId, layer.assetPath, blob);
          const { syncImportedAssetToDisk } = await import("../platform/project-storage.tauri");
          await syncImportedAssetToDisk(layer.assetPath, blob);
        }
      }

      if (!stateUnchanged || forceState) {
        postOutputState(channel, state);
        lastStateByOutputRef.current.set(key, state);
      }
    };

    const runPublish = (options?: PublishOptions) => {
      if (inFlight) {
        pending = true;
        pendingOptions = {
          forceAssets: pendingOptions?.forceAssets || options?.forceAssets || forceAssetsNext,
          forceState: pendingOptions?.forceState || options?.forceState || forceStateNext,
        };
        return;
      }
      inFlight = true;
      const forceAssets = options?.forceAssets === true || forceAssetsNext;
      const forceState = options?.forceState === true || forceStateNext;
      forceAssetsNext = false;
      forceStateNext = false;

      void (async () => {
        try {
          revisionRef.current += 1;
          const revision = revisionRef.current;
          const targets = getTargets();
          const { activeCueIds } = useTransportStore.getState();

          const states = await Promise.all(
            targets.map((outputId) => buildOutputState(revision, outputId)),
          );

          const primaryState = states[0];
          if (primaryState && shouldDeferEmptyOutputPublish(activeCueIds, primaryState.layers)) {
            if (deferAttempts < maxDeferAttempts) {
              deferAttempts += 1;
              if (retryTimeoutId !== 0) window.clearTimeout(retryTimeoutId);
              retryTimeoutId = window.setTimeout(() => {
                retryTimeoutId = 0;
                schedulePublish({
                  forceAssets: !isDiskAssetMode(),
                  forceState,
                });
              }, 50);
              return;
            }
          } else {
            deferAttempts = 0;
          }

          const isInitialEmpty =
            lastStateByOutputRef.current.size === 0 &&
            states.every((state) => state.layers.length === 0) &&
            activeCueIds.length === 0;

          if (isInitialEmpty && !forceState) {
            for (const state of states) {
              lastStateByOutputRef.current.set(outputStateKey(state.outputId), state);
            }
            return;
          }

          for (const state of states) {
            await publishStateToChannel(state, forceAssets, forceState);
          }
        } finally {
          inFlight = false;
          if (pending) {
            pending = false;
            const nextOptions = pendingOptions;
            pendingOptions = undefined;
            runPublish(nextOptions);
          }
        }
      })();
    };

    channel.onmessage = (event) => {
      if (!isOutputMessage(event.data)) return;
      if (event.data.type === "request-state") {
        const diskAssetMode = isDiskAssetMode();
        if (shouldClearPostedAssetsOnRequestState(diskAssetMode)) {
          postedAssetsRef.current.clear();
        }
        schedulePublish(publishOptionsForRequestState(diskAssetMode));
      }
    };

    void channel.ready.then(() => {
      if (!disposed) schedulePublish();
    });

    const unsubTransport = useTransportStore.subscribe((state, prev) => {
      if (
        outputTransportChanged(selectOutputTransportState(prev), selectOutputTransportState(state))
      ) {
        const activeChanged = outputActiveCueIdsChanged(
          selectOutputTransportState(prev),
          selectOutputTransportState(state),
        );
        schedulePublish(
          activeChanged ? publishOptionsForActiveCueChange(isDiskAssetMode()) : undefined,
        );
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
      if (s.id !== prev.id) {
        postedAssetsRef.current.clear();
        lastStateByOutputRef.current.clear();
      }

      const list = getActiveCueListFromState(s);
      const prevList = getActiveCueListFromState(prev);
      const cuesChanged = list?.cues !== prevList?.cues;
      const routingChanged =
        s.cueLists !== prev.cueLists ||
        s.activeCueListId !== prev.activeCueListId ||
        s.masterVideoOutputName !== prev.masterVideoOutputName ||
        s.masterVideoOutputOpacity !== prev.masterVideoOutputOpacity ||
        s.masterVideoOutputEffects !== prev.masterVideoOutputEffects ||
        s.videoBuses !== prev.videoBuses ||
        s.videoOutputs !== prev.videoOutputs;

      if (routingChanged || cuesChanged) {
        schedulePublish();
      }
    });

    return () => {
      disposed = true;
      if (rafId !== 0) cancelAnimationFrame(rafId);
      if (retryTimeoutId !== 0) window.clearTimeout(retryTimeoutId);
      unsubTransport();
      unsubPlayback();
      unsubFade();
      unsubProject();
      channel.close();
      channelRef.current = null;
    };
  }, []);
}
