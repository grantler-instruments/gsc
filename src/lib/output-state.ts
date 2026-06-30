import { resolveAssetBlob } from "../platform/vfs-asset";
import { resolveEffectiveOpacity, resolveEffectiveVolume } from "../stores/fade";
import { usePlaybackStore } from "../stores/playback";
import { useProjectStore } from "../stores/project";
import { useTransportStore } from "../stores/transport";
import type { Cue } from "../types/cue";
import type { MultiviewPreviewState, OutputLayer, OutputState } from "../types/output";
import type { VideoBus } from "../types/video-bus";
import { vfsGetObjectUrl } from "../vfs/engine";
import { findCueInLists } from "./cue-lists";
import { getLoopPlayCount } from "./loop";
import { getMediaDurationSec } from "./media-duration";
import { getPlaybackSliceSec } from "./playback-slice";
import {
  busEffectiveOpacity,
  findVideoBus,
  normalizeMasterVideoOutputName,
  resolveCueVideoBusId,
} from "./video-buses";

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

async function buildLayer(
  cue: Cue,
  goAtMs: number,
  bus: VideoBus | undefined,
): Promise<OutputLayer | undefined> {
  if ((cue.type !== "video" && cue.type !== "image") || !cue.assetPath) {
    return undefined;
  }

  await resolveAssetBlob(cue.assetPath);
  const objectUrl = vfsGetObjectUrl(cue.assetPath);
  if (!objectUrl) return undefined;

  const sourceDurationSec = cue.type === "video" ? getMediaDurationSec(cue.assetPath) : undefined;
  const sliceSec = getPlaybackSliceSec(cue, sourceDurationSec);
  const inTime = cue.inTime ?? 0;
  const loopCount = cue.type === "video" ? getLoopPlayCount(cue) : 1;
  const cueOpacity = resolveEffectiveOpacity(cue.id, clamp01(cue.opacity ?? 1));
  const busOpacity = bus ? busEffectiveOpacity(bus) : 1;

  return {
    cueId: cue.id,
    type: cue.type,
    assetPath: cue.assetPath,
    objectUrl,
    opacity: clamp01(cueOpacity * busOpacity),
    volume: resolveEffectiveVolume(cue.id, clamp01(cue.volume ?? 1)),
    inTime,
    outTime: cue.outTime,
    sliceSec,
    goAtMs,
    loop: loopCount !== 1,
    loopCount,
  };
}

function cueMatchesOutputBus(
  cue: Cue,
  filterBusId: string | undefined,
  videoBuses: VideoBus[],
): boolean {
  const cueBusId = resolveCueVideoBusId(cue, videoBuses);
  return cueBusId === filterBusId;
}

async function buildLayersForActiveCues(
  filterBusId: string | undefined,
): Promise<{ projectId: string; layers: OutputLayer[] }> {
  const { activeCueIds, cueStartedAtMs } = useTransportStore.getState();
  const progressByCueId = usePlaybackStore.getState().byCueId;
  const { cueLists, videoBuses, id: projectId } = useProjectStore.getState();

  const now = Date.now();
  const destinationBus = filterBusId ? findVideoBus(videoBuses, filterBusId) : undefined;

  const layers: OutputLayer[] = [];
  for (const cueId of activeCueIds) {
    const cue = findCueInLists(cueLists, cueId)?.cue;
    if (!cue) continue;
    if (!cueMatchesOutputBus(cue, filterBusId, videoBuses)) continue;

    const progress = progressByCueId[cueId];
    const goAtMs = cueStartedAtMs[cueId] ?? (progress ? now - progress.elapsedSec * 1000 : now);

    const layer = await buildLayer(cue, goAtMs, destinationBus);
    if (layer) layers.push(layer);
  }

  return { projectId, layers };
}

/** Build the current visual output snapshot from live stores. */
export async function buildOutputState(
  revision: number,
  filterBusId?: string,
): Promise<OutputState> {
  const { projectId, layers } = await buildLayersForActiveCues(filterBusId);
  const outputBus = filterBusId
    ? findVideoBus(useProjectStore.getState().videoBuses, filterBusId)
    : undefined;
  const masterName = normalizeMasterVideoOutputName(
    useProjectStore.getState().masterVideoOutputName,
  );

  return {
    revision,
    projectId,
    ...(filterBusId
      ? { busId: filterBusId, ...(outputBus ? { busName: outputBus.name } : {}) }
      : { busName: masterName }),
    layers,
  };
}

/** One preview tile per output window (master + each video bus). */
export async function buildMultiviewPreviewState(revision: number): Promise<MultiviewPreviewState> {
  const videoBuses = useProjectStore.getState().videoBuses;
  const masterName = normalizeMasterVideoOutputName(
    useProjectStore.getState().masterVideoOutputName,
  );
  const master = await buildLayersForActiveCues(undefined);
  const destinations: MultiviewPreviewState["destinations"] = [
    {
      busName: masterName,
      layers: master.layers,
    },
  ];

  for (const bus of videoBuses) {
    const { layers } = await buildLayersForActiveCues(bus.id);
    destinations.push({
      busId: bus.id,
      busName: bus.name,
      layers,
    });
  }

  return {
    revision,
    projectId: master.projectId,
    destinations,
  };
}

/** Bus ids that should receive dedicated output publishers. */
export function listVideoOutputBusIds(videoBuses: VideoBus[]): string[] {
  return videoBuses.map((bus) => bus.id);
}
