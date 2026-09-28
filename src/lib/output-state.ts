import { getPlatform } from "../platform";
import { resolveAssetBlob } from "../platform/vfs-asset";
import { resolveEffectiveOpacity, resolveEffectiveVolume } from "../stores/fade";
import { usePlaybackStore } from "../stores/playback";
import { useProjectStore } from "../stores/project";
import { useProjectLocationStore } from "../stores/project-location";
import { useTransportStore } from "../stores/transport";
import { useVfsStore } from "../stores/vfs";
import type { Cue } from "../types/cue";
import type { MultiviewPreviewState, OutputLayer, OutputState } from "../types/output";
import type { VideoBus } from "../types/video-bus";
import type { VideoOutput } from "../types/video-output";
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
  resolveCueVideoBusId,
} from "./video-buses";
import {
  findVideoOutput,
  listPublishableVideoOutputIds,
  resolveOutputBusId,
} from "./video-outputs";

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

function cueMatchesProgramBus(
  cue: Cue,
  programBusId: string | undefined,
  videoBuses: VideoBus[],
): boolean {
  const cueBusId = resolveCueVideoBusId(cue, videoBuses);
  return cueBusId === programBusId;
}

function activeCueIdsForProgramBus(
  activeCueIds: string[],
  programBusId: string | undefined,
  videoBuses: VideoBus[],
  cueLists: ReturnType<typeof useProjectStore.getState>["cueLists"],
): string[] {
  return activeCueIds.filter((cueId) => {
    const cue = findCueInLists(cueLists, cueId)?.cue;
    if (!cue) return false;
    return cueMatchesProgramBus(cue, programBusId, videoBuses);
  });
}

async function buildLayersForActiveCues(
  programBusId: string | undefined,
): Promise<{ projectId: string; layers: OutputLayer[] }> {
  const { activeCueIds, cueStartedAtMs } = useTransportStore.getState();
  const progressByCueId = usePlaybackStore.getState().byCueId;
  const { cueLists, videoBuses, id: projectId } = useProjectStore.getState();

  const now = transportNowMs();

  const layers: OutputLayer[] = [];
  for (const cueId of activeCueIds) {
    const cue = findCueInLists(cueLists, cueId)?.cue;
    if (!cue) continue;
    if (!cueMatchesProgramBus(cue, programBusId, videoBuses)) continue;

    const progress = progressByCueId[cueId];
    const goAtMs = cueStartedAtMs[cueId] ?? (progress ? now - progress.elapsedSec * 1000 : now);

    const layer = await buildLayer(cue, goAtMs);
    if (layer) layers.push(layer);
  }

  return { projectId, layers };
}

function programLook(
  programBusId: string | undefined,
  videoBuses: VideoBus[],
  masterVideoOutputOpacity: number,
  masterVideoOutputEffects: ReturnType<typeof useProjectStore.getState>["masterVideoOutputEffects"],
  masterVideoOutputName: string,
): { busOpacity: number; busEffects?: typeof masterVideoOutputEffects; busName: string } {
  const outputBus = programBusId ? findVideoBus(videoBuses, programBusId) : undefined;
  return {
    busOpacity: outputBus
      ? busEffectiveOpacity(outputBus)
      : masterVideoOutputEffectiveOpacity(masterVideoOutputOpacity),
    ...(outputBus?.effects?.length
      ? { busEffects: outputBus.effects }
      : masterVideoOutputEffects?.length
        ? { busEffects: masterVideoOutputEffects }
        : {}),
    busName: outputBus?.name ?? masterVideoOutputName,
  };
}

/** Build the current visual output snapshot for a destination. */
export async function buildOutputState(revision: number, outputId: string): Promise<OutputState> {
  const {
    cueLists,
    videoBuses,
    videoOutputs,
    masterVideoOutputEffects,
    masterVideoOutputOpacity,
    masterVideoOutputName,
  } = useProjectStore.getState();
  const output = findVideoOutput(videoOutputs, outputId);
  const programBusId = output ? resolveOutputBusId(output, videoBuses) : undefined;
  const { projectId, layers } = await buildLayersForActiveCues(programBusId);
  const { activeCueIds } = useTransportStore.getState();
  const look = programLook(
    programBusId,
    videoBuses,
    masterVideoOutputOpacity,
    masterVideoOutputEffects,
    masterVideoOutputName,
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
    outputId,
    ...(programBusId ? { busId: programBusId } : {}),
    outputName: output?.name ?? look.busName,
    busName: look.busName,
    activeCueIds: activeCueIdsForProgramBus(activeCueIds, programBusId, videoBuses, cueLists),
    layers,
    busOpacity: look.busOpacity,
    ...(look.busEffects ? { busEffects: look.busEffects } : {}),
    ...(output?.outputFrame ? { outputFrame: output.outputFrame } : {}),
  };
}

/** One preview tile per video output destination. */
export async function buildMultiviewPreviewState(revision: number): Promise<MultiviewPreviewState> {
  const {
    videoBuses,
    videoOutputs,
    masterVideoOutputName,
    masterVideoOutputEffects,
    masterVideoOutputOpacity,
  } = useProjectStore.getState();

  const destinations: MultiviewPreviewState["destinations"] = [];
  let projectId = useProjectStore.getState().id;

  for (const output of videoOutputs) {
    const programBusId = resolveOutputBusId(output, videoBuses);
    const { projectId: pid, layers } = await buildLayersForActiveCues(programBusId);
    projectId = pid;
    const look = programLook(
      programBusId,
      videoBuses,
      masterVideoOutputOpacity,
      masterVideoOutputEffects,
      masterVideoOutputName,
    );
    destinations.push({
      outputId: output.id,
      ...(programBusId ? { busId: programBusId } : {}),
      busName: look.busName,
      outputName: output.name,
      layers,
      busOpacity: look.busOpacity,
      ...(look.busEffects ? { busEffects: look.busEffects } : {}),
      ...(output.outputFrame ? { outputFrame: output.outputFrame } : {}),
    });
  }

  return {
    revision,
    projectId,
    destinations,
  };
}

/** Output ids that should receive dedicated output publishers. */
export function listVideoOutputIds(videoOutputs: VideoOutput[]): string[] {
  return listPublishableVideoOutputIds(videoOutputs);
}

/** @deprecated Use listVideoOutputIds. */
export function listVideoOutputBusIds(videoBuses: VideoBus[]): string[] {
  return videoBuses.map((bus) => bus.id);
}

/** True when transport is active but visual layers are not ready to publish yet. */
export function hasUnresolvedVisualOutput(activeCueIds: string[], layers: OutputLayer[]): boolean {
  if (activeCueIds.length === 0 || layers.length > 0) return false;

  const cueById = new Map(
    useProjectStore
      .getState()
      .cueLists.reduce<Cue[]>((all, list) => all.concat(list.cues), [])
      .map((c) => [c.id, c]),
  );

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
