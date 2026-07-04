import { useEffect, useState } from "react";
import { buildMultiviewPreviewState, shouldDeferEmptyOutputPublish } from "../lib/output-state";
import { useFadeStore } from "../stores/fade";
import { usePlaybackStore } from "../stores/playback";
import { useProjectStore } from "../stores/project";
import { useTransportStore } from "../stores/transport";
import { useVfsStore } from "../stores/vfs";
import type { OutputPreviewDestination } from "../types/output";

/** Live multiview previews — one tile per output window. */
export function useVisualOutputPreviews(): OutputPreviewDestination[] {
  const activeCueIds = useTransportStore((s) => s.activeCueIds);
  const activeCueListId = useProjectStore((s) => s.activeCueListId);
  const cueLists = useProjectStore((s) => s.cueLists);
  const byCueId = usePlaybackStore((s) => s.byCueId);
  const frameMs = useFadeStore((s) => s.frameMs);
  const videoBuses = useProjectStore((s) => s.videoBuses);
  const masterVideoOutputName = useProjectStore((s) => s.masterVideoOutputName);
  const masterVideoOutputOpacity = useProjectStore((s) => s.masterVideoOutputOpacity);
  const masterVideoOutputEffects = useProjectStore((s) => s.masterVideoOutputEffects);
  const masterVideoOutputFrame = useProjectStore((s) => s.masterVideoOutputFrame);
  const vfsLoadedKey = useVfsStore((s) =>
    s.entries.map((entry) => `${entry.path}:${entry.loaded}`).join("|"),
  );
  const [destinations, setDestinations] = useState<OutputPreviewDestination[]>([]);

  useEffect(() => {
    void activeCueListId;
    void cueLists;
    void byCueId;
    void frameMs;
    void videoBuses;
    void masterVideoOutputName;
    void masterVideoOutputOpacity;
    void masterVideoOutputEffects;
    void masterVideoOutputFrame;
    void vfsLoadedKey;

    let cancelled = false;
    let retryTimeoutId = 0;
    let deferAttempts = 0;
    const maxDeferAttempts = 40;

    const refresh = () => {
      void buildMultiviewPreviewState(0).then((state) => {
        if (cancelled) return;
        setDestinations(state.destinations);

        const waitingForLayers = state.destinations.some((destination) =>
          shouldDeferEmptyOutputPublish(activeCueIds, destination.layers),
        );
        if (waitingForLayers && deferAttempts < maxDeferAttempts) {
          deferAttempts += 1;
          retryTimeoutId = window.setTimeout(refresh, 50);
        }
      });
    };

    refresh();

    return () => {
      cancelled = true;
      if (retryTimeoutId !== 0) window.clearTimeout(retryTimeoutId);
    };
  }, [
    activeCueIds,
    activeCueListId,
    cueLists,
    byCueId,
    frameMs,
    videoBuses,
    masterVideoOutputName,
    masterVideoOutputOpacity,
    masterVideoOutputEffects,
    masterVideoOutputFrame,
    vfsLoadedKey,
  ]);

  return destinations;
}
