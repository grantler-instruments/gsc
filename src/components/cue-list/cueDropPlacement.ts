import type { DragEvent } from "react";

export type ContainerRowDropMode = "before" | "after" | "into";

const CONTAINER_EDGE_ZONE = 0.25;

export function computeInsertPlace(
  e: DragEvent,
  cached: "before" | "after" | null,
): "before" | "after" {
  if (cached) return cached;
  const rect = e.currentTarget.getBoundingClientRect();
  return e.clientY < rect.top + rect.height / 2 ? "before" : "after";
}

/** Drop mode for container cue rows: sibling before/after, or into the container. */
export function computeContainerRowDropMode(
  e: DragEvent,
  cached: ContainerRowDropMode | null,
): ContainerRowDropMode {
  if (cached) return cached;
  const rect = e.currentTarget.getBoundingClientRect();
  const relY = (e.clientY - rect.top) / rect.height;
  if (relY <= CONTAINER_EDGE_ZONE) return "before";
  if (relY >= 1 - CONTAINER_EDGE_ZONE) return "after";
  return "into";
}

/** Resolve the cue row under the pointer, if any. */
export function readCueRowDropTarget(e: DragEvent): {
  cueId: string;
  place: "before" | "after";
} | null {
  const target = e.target;
  if (!(target instanceof Element)) return null;

  const row = target.closest<HTMLElement>("[data-cue-id][data-gsc-drop-zone='cue-row']");
  if (!row) return null;

  const cueId = row.dataset.cueId;
  if (!cueId) return null;

  const rect = row.getBoundingClientRect();
  const place = e.clientY < rect.top + rect.height / 2 ? "before" : "after";
  return { cueId, place };
}
