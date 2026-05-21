import type { AssetKind } from "../types/cue";

export const GSC_ASSET_DRAG_TYPE = "application/x-gsc-asset";

const ASSET_KINDS: AssetKind[] = ["audio", "video", "image"];

export interface AssetDragPayload {
  path: string;
  name: string;
  kind: AssetKind;
}

export function setAssetDragData(
  dataTransfer: DataTransfer,
  payload: AssetDragPayload,
): void {
  dataTransfer.setData(GSC_ASSET_DRAG_TYPE, JSON.stringify(payload));
  dataTransfer.effectAllowed = "copy";
}

export function readAssetDragData(
  dataTransfer: DataTransfer,
): AssetDragPayload | null {
  const raw = dataTransfer.getData(GSC_ASSET_DRAG_TYPE);
  if (!raw) return null;
  try {
    const data = JSON.parse(raw) as AssetDragPayload;
    if (
      typeof data.path === "string" &&
      typeof data.name === "string" &&
      ASSET_KINDS.includes(data.kind)
    ) {
      return data;
    }
  } catch {
    /* ignore */
  }
  return null;
}

export function isAssetDrag(dataTransfer: DataTransfer): boolean {
  return dataTransfer.types.includes(GSC_ASSET_DRAG_TYPE);
}

export const GSC_CUE_DRAG_TYPE = "application/x-gsc-cue";

export interface CueDragPayload {
  cueId: string;
}

export function setCueDragData(
  dataTransfer: DataTransfer,
  payload: CueDragPayload,
): void {
  dataTransfer.setData(GSC_CUE_DRAG_TYPE, JSON.stringify(payload));
  dataTransfer.effectAllowed = "move";
}

export function readCueDragData(
  dataTransfer: DataTransfer,
): CueDragPayload | null {
  const raw = dataTransfer.getData(GSC_CUE_DRAG_TYPE);
  if (!raw) return null;
  try {
    const data = JSON.parse(raw) as CueDragPayload;
    if (typeof data.cueId === "string") return data;
  } catch {
    /* ignore */
  }
  return null;
}

export function isCueDrag(dataTransfer: DataTransfer): boolean {
  return dataTransfer.types.includes(GSC_CUE_DRAG_TYPE);
}
