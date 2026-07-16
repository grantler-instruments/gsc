import type { OutputLayer, OutputState } from "../types/output";

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
    outputLayersEqual(a.layers, b.layers)
  );
}

/** Opacity/volume-only change — media mount and transport unchanged. */
export function isOutputStateFadeOnly(prev: OutputState, next: OutputState): boolean {
  return (
    prev.projectId === next.projectId &&
    prev.projectRootDir === next.projectRootDir &&
    activeCueIdsEqual(prev.activeCueIds, next.activeCueIds) &&
    outputLayersMediaEqual(prev.layers, next.layers) &&
    !outputStatesEqual(prev, next)
  );
}

/** Stable key for deduping cross-window asset posts. */
export function outputAssetKey(projectId: string, assetPath: string): string {
  return `${projectId}:${assetPath}`;
}
