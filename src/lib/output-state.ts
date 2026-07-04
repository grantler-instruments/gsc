import { getPlatform } from "../platform";
import { resolveAssetBlob } from "../platform/vfs-asset";
import { resolveEffectiveOpacity, resolveEffectiveVolume } from "../stores/fade";
import { usePlaybackStore } from "../stores/playback";
import { getActiveCueListFromState, useProjectStore } from "../stores/project";
import { useProjectLocationStore } from "../stores/project-location";
import { useTransportStore } from "../stores/transport";
import { useVfsStore } from "../stores/vfs";
import type { Cue } from "../types/cue";
import type { MultiviewPreviewState, OutputLayer, OutputState } from "../types/output";
import type { VideoBus } from "../types/video-bus";
import { vfsGetObjectUrl } from "../vfs/engine";
import { clamp01 } from "./clamp";
import { findCueInLists } from "./cue-lists";
import { getLoopPlayCount } from "./loop";
import { getMediaDurationSec } from "./media-duration";
import { getPlaybackSliceSec } from "./playback-slice";
import { transportNowMs } from "./transport-clock";
import {
  busEffectiveOpacity,
  findVideoBus,
  masterVideoOutputEffectiveOpacity,
  normalizeMasterVideoOutputName,
  resolveCueVideoBusId,
} from "./video-buses";
import { normalizeVideoOutputFrame, serializeVideoOutputFrame } from "./video-output-frame";

async function buildLayer(cue: Cue, goAtMs: number): Promise<OutputLayer | undefined> {
  if ((cue.type !== "video" && cue.type !== "image") || !cue.assetPath) {
    return undefined;
  }

  let objectUrl: string | undefined;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    await resolveAssetBlob(cue.assetPath);
    objectUrl = vfsGetObjectUrl(cue.assetPath);
    if (objectUrl) break;
    if (attempt < 4) {
      await new Promise((resolve) => setTimeout(resolve, 40));
    }
  }
  if (!objectUrl) return undefined;

  const sourceDurationSec = cue.type === "video" ? getMediaDurationSec(cue.assetPath) : undefined;
  const sliceSec = getPlaybackSliceSec(cue, sourceDurationSec);
  const inTime = cue.inTime ?? 0;
  const loopCount = cue.type === "video" ? getLoopPlayCount(cue) : 1;
  const cueOpacity = resolveEffectiveOpacity(cue.id, clamp01(cue.opacity ?? 1));

  return {
    cueId: cue.id,
    type: cue.type,
    assetPath: cue.assetPath,
    objectUrl,
    opacity: cueOpacity,
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

function activeCueIdsForBus(
  activeCueIds: string[],
  filterBusId: string | undefined,
  videoBuses: VideoBus[],
  cueLists: ReturnType<typeof useProjectStore.getState>["cueLists"],
): string[] {
  return activeCueIds.filter((cueId) => {
    const cue = findCueInLists(cueLists, cueId)?.cue;
    if (!cue) return false;
    return cueMatchesOutputBus(cue, filterBusId, videoBuses);
  });
}

async function buildLayersForActiveCues(
  filterBusId: string | undefined,
): Promise<{ projectId: string; layers: OutputLayer[] }> {
  const { activeCueIds, cueStartedAtMs } = useTransportStore.getState();
  const progressByCueId = usePlaybackStore.getState().byCueId;
  const { cueLists, videoBuses, id: projectId } = useProjectStore.getState();

  const now = transportNowMs();

  const layers: OutputLayer[] = [];
  for (const cueId of activeCueIds) {
    const cue = findCueInLists(cueLists, cueId)?.cue;
    if (!cue) continue;
    if (!cueMatchesOutputBus(cue, filterBusId, videoBuses)) continue;

    const progress = progressByCueId[cueId];
    const goAtMs = cueStartedAtMs[cueId] ?? (progress ? now - progress.elapsedSec * 1000 : now);

    const layer = await buildLayer(cue, goAtMs);
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
  const {
    cueLists,
    videoBuses,
    masterVideoOutputEffects,
    masterVideoOutputOpacity,
    masterVideoOutputFrame,
  } = useProjectStore.getState();
  const { activeCueIds } = useTransportStore.getState();
  const outputBus = filterBusId ? findVideoBus(videoBuses, filterBusId) : undefined;
  const masterName = normalizeMasterVideoOutputName(
    useProjectStore.getState().masterVideoOutputName,
  );
  const projectRootDir =
    getPlatform() === "tauri" ? useProjectLocationStore.getState().rootDir : null;

  if (layers.length > 0) {
    useVfsStore.getState().refreshEntriesLoaded();
  }

  return {
    revision,
    projectId,
    projectRootDir,
    activeCueIds: activeCueIdsForBus(activeCueIds, filterBusId, videoBuses, cueLists),
    ...(filterBusId
      ? { busId: filterBusId, ...(outputBus ? { busName: outputBus.name } : {}) }
      : { busName: masterName }),
    layers,
    busOpacity: outputBus
      ? busEffectiveOpacity(outputBus)
      : masterVideoOutputEffectiveOpacity(masterVideoOutputOpacity),
    ...(outputBus?.effects?.length
      ? { busEffects: outputBus.effects }
      : masterVideoOutputEffects?.length
        ? { busEffects: masterVideoOutputEffects }
        : {}),
    ...(filterBusId
      ? outputBus?.outputFrame
        ? { outputFrame: outputBus.outputFrame }
        : {}
      : serializeVideoOutputFrame(normalizeVideoOutputFrame(masterVideoOutputFrame))
        ? { outputFrame: normalizeVideoOutputFrame(masterVideoOutputFrame) }
        : {}),
  };
}

/** One preview tile per output window (master + each video bus). */
export async function buildMultiviewPreviewState(revision: number): Promise<MultiviewPreviewState> {
  const videoBuses = useProjectStore.getState().videoBuses;
  const {
    masterVideoOutputName,
    masterVideoOutputEffects,
    masterVideoOutputOpacity,
    masterVideoOutputFrame,
  } = useProjectStore.getState();
  const masterName = normalizeMasterVideoOutputName(masterVideoOutputName);
  const master = await buildLayersForActiveCues(undefined);
  const destinations: MultiviewPreviewState["destinations"] = [
    {
      busName: masterName,
      layers: master.layers,
      busOpacity: masterVideoOutputEffectiveOpacity(masterVideoOutputOpacity),
      ...(masterVideoOutputEffects?.length ? { busEffects: masterVideoOutputEffects } : {}),
      ...(serializeVideoOutputFrame(normalizeVideoOutputFrame(masterVideoOutputFrame))
        ? { outputFrame: normalizeVideoOutputFrame(masterVideoOutputFrame) }
        : {}),
    },
  ];

  for (const bus of videoBuses) {
    const { layers } = await buildLayersForActiveCues(bus.id);
    destinations.push({
      busId: bus.id,
      busName: bus.name,
      layers,
      busOpacity: busEffectiveOpacity(bus),
      ...(bus.effects?.length ? { busEffects: bus.effects } : {}),
      ...(bus.outputFrame ? { outputFrame: bus.outputFrame } : {}),
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

/** True when transport is active but visual layers are not ready to publish yet. */
export function hasUnresolvedVisualOutput(activeCueIds: string[], layers: OutputLayer[]): boolean {
  if (activeCueIds.length === 0 || layers.length > 0) return false;

  const list = getActiveCueListFromState(useProjectStore.getState());
  const cueById = new Map(list?.cues.map((c) => [c.id, c]) ?? []);

  for (const cueId of activeCueIds) {
    const cue = cueById.get(cueId);
    if (cue && (cue.type === "video" || cue.type === "image") && cue.assetPath) {
      return true;
    }
  }

  return false;
}

/** True when transport expects output content but the snapshot has no layers yet. */
export function shouldDeferEmptyOutputPublish(
  activeCueIds: string[],
  layers: OutputLayer[],
): boolean {
  return activeCueIds.length > 0 && layers.length === 0;
}
