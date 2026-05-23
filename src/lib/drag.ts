import type { AssetKind } from "../types/cue";

export const GSC_ASSET_DRAG_TYPE = "application/x-gsc-asset";

const ASSET_KINDS: AssetKind[] = ["audio", "video", "image"];

export interface AssetDragPayload {
  path: string;
  name: string;
  kind: AssetKind;
}

/** In-flight asset drag (WKWebView/Tauri may not expose custom getData on drop). */
let activeAssetDrag: AssetDragPayload | null = null;

export function setActiveAssetDrag(payload: AssetDragPayload | null): void {
  activeAssetDrag = payload;
}

export function getActiveAssetDrag(): AssetDragPayload | null {
  return activeAssetDrag;
}

export function setAssetDragData(dataTransfer: DataTransfer, payload: AssetDragPayload): void {
  activeAssetDrag = payload;
  dataTransfer.setData(GSC_ASSET_DRAG_TYPE, JSON.stringify(payload));
  dataTransfer.effectAllowed = "copy";
}

function parseAssetDragPayload(raw: string): AssetDragPayload | null {
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

export function readAssetDragData(dataTransfer: DataTransfer): AssetDragPayload | null {
  const raw = dataTransfer.getData(GSC_ASSET_DRAG_TYPE);
  if (raw) {
    const parsed = parseAssetDragPayload(raw);
    if (parsed) return parsed;
  }
  return activeAssetDrag;
}

export function isAssetDrag(dataTransfer: DataTransfer): boolean {
  return dataTransfer.types.includes(GSC_ASSET_DRAG_TYPE) || activeAssetDrag !== null;
}

export const GSC_CUE_DRAG_TYPE = "application/x-gsc-cue";

export interface CueDragPayload {
  cueId: string;
}

export function setCueDragData(dataTransfer: DataTransfer, payload: CueDragPayload): void {
  dataTransfer.setData(GSC_CUE_DRAG_TYPE, JSON.stringify(payload));
  dataTransfer.effectAllowed = "move";
}

export function readCueDragData(dataTransfer: DataTransfer): CueDragPayload | null {
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

/** Cue id for the in-flight list reorder drag (getData is empty until drop). */
let activeCueDragId: string | null = null;

export function setActiveCueDrag(cueId: string | null): void {
  activeCueDragId = cueId;
}

export function getActiveCueDragId(): string | null {
  return activeCueDragId;
}

/** Resolve cue id during drag or on drop. */
export function readCueDragId(dataTransfer: DataTransfer): string | null {
  return readCueDragData(dataTransfer)?.cueId ?? activeCueDragId;
}
