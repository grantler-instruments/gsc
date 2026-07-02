import { getPlatform } from "../platform";
import { resolveAssetBlob } from "../platform/vfs-asset";
import { resolveEffectiveOpacity, resolveEffectiveVolume } from "../stores/fade";
import { usePlaybackStore } from "../stores/playback";
import { getActiveCueListFromState, useProjectStore } from "../stores/project";
import { useProjectLocationStore } from "../stores/project-location";
import { useTransportStore } from "../stores/transport";
import { useVfsStore } from "../stores/vfs";
import type { Cue } from "../types/cue";
import type { OutputLayer, OutputState } from "../types/output";
import { vfsGetObjectUrl } from "../vfs/engine";
import { getLoopPlayCount } from "./loop";
import { getMediaDurationSec } from "./media-duration";
import { getPlaybackSliceSec } from "./playback-slice";

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

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

  return {
    cueId: cue.id,
    type: cue.type,
    assetPath: cue.assetPath,
    objectUrl,
    opacity: resolveEffectiveOpacity(cue.id, clamp01(cue.opacity ?? 1)),
    volume: resolveEffectiveVolume(cue.id, clamp01(cue.volume ?? 1)),
    inTime,
    outTime: cue.outTime,
    sliceSec,
    goAtMs,
    loop: loopCount !== 1,
    loopCount,
  };
}

/** Build the current visual output snapshot from live stores. */
export async function buildOutputState(revision: number): Promise<OutputState> {
  const { activeCueIds, cueStartedAtMs } = useTransportStore.getState();
  const progressByCueId = usePlaybackStore.getState().byCueId;

  const list = getActiveCueListFromState(useProjectStore.getState());
  const cueById = new Map(list?.cues.map((c) => [c.id, c]) ?? []);
  const now = Date.now();

  const layers: OutputLayer[] = [];
  for (const cueId of activeCueIds) {
    const cue = cueById.get(cueId);
    if (!cue) continue;

    const progress = progressByCueId[cueId];
    const goAtMs = cueStartedAtMs[cueId] ?? (progress ? now - progress.elapsedSec * 1000 : now);

    const layer = await buildLayer(cue, goAtMs);
    if (layer) layers.push(layer);
  }

  const { id: projectId } = useProjectStore.getState();
  const projectRootDir =
    getPlatform() === "tauri" ? useProjectLocationStore.getState().rootDir : null;

  if (layers.length > 0) {
    useVfsStore.getState().refreshEntriesLoaded();
  }

  return { revision, projectId, projectRootDir, activeCueIds, layers };
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
