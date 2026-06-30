import { getMainSequenceListFromState, useProjectStore } from "../stores/project";
import { applyAssetPayloads } from "./asset-drop";
import { findCueInLists } from "./cue-lists";
import type { AssetDragPayload } from "./drag";
import { canEditProject } from "./show-mode";

export const GSC_DROP_ZONE = "data-gsc-drop-zone";
export const GSC_CUE_ID = "data-cue-id";
export const GSC_LIST_ID = "data-list-id";

/** macOS: native drop Y is ~28px above the pointer tip (tauri-apps/tauri#10744). */
const MACOS_DROP_Y_NUDGE = 28;

export type TauriDropTarget =
  | { kind: "cue-list"; listId?: string }
  | { kind: "cue-row"; cueId: string }
  | { kind: "assets" }
  | { kind: "none" };

export function findDropTarget(element: Element | null): TauriDropTarget {
  if (!element) return { kind: "none" };

  const row = element.closest(`[${GSC_DROP_ZONE}="cue-row"]`);
  if (row instanceof HTMLElement) {
    const cueId = row.getAttribute(GSC_CUE_ID);
    if (cueId) return { kind: "cue-row", cueId };
  }

  const listEl = element.closest(`[${GSC_DROP_ZONE}="cue-list"]`);
  if (listEl instanceof HTMLElement) {
    return { kind: "cue-list", listId: listEl.getAttribute(GSC_LIST_ID) ?? undefined };
  }

  if (element.closest(`[${GSC_DROP_ZONE}="assets"]`)) {
    return { kind: "assets" };
  }

  return { kind: "none" };
}

function isMacOs(): boolean {
  return /mac/i.test(navigator.platform) || /mac/i.test(navigator.userAgent);
}

/** Convert Tauri window-relative physical drop coords to viewport client coords. */
export async function dragDropPositionToClient(position: {
  x: number;
  y: number;
}): Promise<{ x: number; y: number }> {
  const { PhysicalPosition } = await import("@tauri-apps/api/dpi");
  const { getCurrentWindow } = await import("@tauri-apps/api/window");

  const win = getCurrentWindow();
  const factor = await win.scaleFactor();

  const phys =
    position instanceof PhysicalPosition ? position : new PhysicalPosition(position.x, position.y);
  const logical = phys.toLogical(factor);

  const [outerPos, innerPos] = await Promise.all([win.outerPosition(), win.innerPosition()]);
  const chrome = innerPos.toLogical(factor);
  const outer = outerPos.toLogical(factor);

  const x = logical.x - (chrome.x - outer.x);
  let y = logical.y - (chrome.y - outer.y);

  if (isMacOs()) {
    y += MACOS_DROP_Y_NUDGE;
  }

  return { x, y };
}

function pointInRect(x: number, y: number, rect: DOMRect): boolean {
  return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
}

function findDropTargetByRects(clientX: number, clientY: number): TauriDropTarget {
  const rows = document.querySelectorAll(`[${GSC_DROP_ZONE}="cue-row"]`);
  for (const row of rows) {
    if (!(row instanceof HTMLElement)) continue;
    if (pointInRect(clientX, clientY, row.getBoundingClientRect())) {
      const cueId = row.getAttribute(GSC_CUE_ID);
      if (cueId) return { kind: "cue-row", cueId };
    }
  }

  const listEls = document.querySelectorAll(`[${GSC_DROP_ZONE}="cue-list"]`);
  for (const listEl of listEls) {
    if (!(listEl instanceof HTMLElement)) continue;
    if (pointInRect(clientX, clientY, listEl.getBoundingClientRect())) {
      return { kind: "cue-list", listId: listEl.getAttribute(GSC_LIST_ID) ?? undefined };
    }
  }

  const assetsEl = document.querySelector(`[${GSC_DROP_ZONE}="assets"]`);
  if (assetsEl && pointInRect(clientX, clientY, assetsEl.getBoundingClientRect())) {
    return { kind: "assets" };
  }

  return { kind: "none" };
}

/** Mutually exclusive hover highlights for native OS file drags. */
export function tauriDragHighlightState(target: TauriDropTarget): {
  assets: boolean;
  cueList: boolean;
} {
  if (target.kind === "assets") {
    return { assets: true, cueList: false };
  }
  if (target.kind === "cue-list" || target.kind === "cue-row") {
    return { assets: false, cueList: true };
  }
  // Default drop zone is the cue list — never highlight assets on a miss.
  return { assets: false, cueList: true };
}

export async function dropTargetAtPhysicalPosition(position: {
  x: number;
  y: number;
}): Promise<TauriDropTarget> {
  const client = await dragDropPositionToClient(position);
  const byRects = findDropTargetByRects(client.x, client.y);
  if (byRects.kind !== "none") return byRects;

  return findDropTarget(document.elementFromPoint(client.x, client.y));
}

function defaultSequenceListId(): string | undefined {
  return getMainSequenceListFromState(useProjectStore.getState())?.id;
}

/** Cue drops unless the pointer is clearly over the assets panel. */
export function effectiveDropTarget(target: TauriDropTarget): TauriDropTarget {
  if (target.kind === "assets") return target;
  if (target.kind === "none") return { kind: "cue-list", listId: defaultSequenceListId() };
  if (target.kind === "cue-list" && !target.listId) {
    return { kind: "cue-list", listId: defaultSequenceListId() };
  }
  return target;
}

/** Native Tauri file drops — maps DOM target to shared asset-drop handler. */
export function applyAssetDropPayloads(
  payloads: AssetDragPayload[],
  target: TauriDropTarget,
): void {
  if (!payloads.length || !canEditProject()) return;

  const resolved = effectiveDropTarget(target);
  if (resolved.kind === "assets") return;

  if (resolved.kind === "cue-row") {
    const found = findCueInLists(useProjectStore.getState().cueLists, resolved.cueId);
    const listId = found?.list.id ?? defaultSequenceListId();
    if (!listId) return;
    applyAssetPayloads(payloads, { kind: "row", listId, cueId: resolved.cueId });
    return;
  }

  if (resolved.kind !== "cue-list") return;
  const listId = resolved.listId ?? defaultSequenceListId();
  if (!listId) return;
  applyAssetPayloads(payloads, { kind: "list", listId });
}
