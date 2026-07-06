import type { OutputLayer, OutputState } from "../types/output";
import { videoEffectsEqual } from "./video-effects";
import { videoOutputFramesEqual } from "./video-output-frame";

/** Compare layers for visual/output sync — ignores publisher-only objectUrl differences. */
export function outputLayersEqual(a: OutputLayer[], b: OutputLayer[]): boolean {
  if (a.length !== b.length) return false;

  for (let i = 0; i < a.length; i += 1) {
    const left = a[i];
    const right = b[i];
    if (
      left.cueId !== right.cueId ||
      left.type !== right.type ||
      left.assetPath !== right.assetPath ||
      left.opacity !== right.opacity ||
      left.volume !== right.volume ||
      left.inTime !== right.inTime ||
      left.outTime !== right.outTime ||
      left.sliceSec !== right.sliceSec ||
      left.goAtMs !== right.goAtMs ||
      left.loop !== right.loop ||
      left.loopCount !== right.loopCount
    ) {
      return false;
    }
  }

  return true;
}

/** Compare resolved output layers for media mount — ignores fade-only opacity/volume. */
export function outputLayersMediaEqual(a: OutputLayer[], b: OutputLayer[]): boolean {
  if (a.length !== b.length) return false;

  for (let i = 0; i < a.length; i += 1) {
    const left = a[i];
    const right = b[i];
    if (
      left.cueId !== right.cueId ||
      left.type !== right.type ||
      left.assetPath !== right.assetPath ||
      left.objectUrl !== right.objectUrl ||
      left.inTime !== right.inTime ||
      left.outTime !== right.outTime ||
      left.sliceSec !== right.sliceSec ||
      left.goAtMs !== right.goAtMs ||
      left.loop !== right.loop ||
      left.loopCount !== right.loopCount
    ) {
      return false;
    }
  }

  return true;
}

function activeCueIdsEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

export function outputStatesEqual(a: OutputState, b: OutputState): boolean {
  return (
    a.projectId === b.projectId &&
    a.projectRootDir === b.projectRootDir &&
    activeCueIdsEqual(a.activeCueIds, b.activeCueIds) &&
    outputLayersEqual(a.layers, b.layers) &&
    (a.busOpacity ?? 1) === (b.busOpacity ?? 1) &&
    videoEffectsEqual(a.busEffects, b.busEffects) &&
    videoOutputFramesEqual(a.outputFrame, b.outputFrame)
  );
}

/** Layer opacity or bus dimmer/effects only — media mount and transport unchanged. */
export function isOutputStateVisualMixOnly(prev: OutputState, next: OutputState): boolean {
  return (
    prev.projectId === next.projectId &&
    prev.projectRootDir === next.projectRootDir &&
    activeCueIdsEqual(prev.activeCueIds, next.activeCueIds) &&
    outputLayersMediaEqual(prev.layers, next.layers) &&
    !outputStatesEqual(prev, next)
  );
}

/** @deprecated Use isOutputStateVisualMixOnly */
export const isOutputStateFadeOnly = isOutputStateVisualMixOnly;

/** Stable key for deduping cross-window asset posts. */
export function outputAssetKey(projectId: string, assetPath: string): string {
  return `${projectId}:${assetPath}`;
}
