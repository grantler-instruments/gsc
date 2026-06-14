import type { GscTokenSet } from "../../theme/tokens";

/** Collapsed while dragging; expands when the pointer is over this zone. */
export function cueDropZoneSx(tokens: GscTokenSet, dropActive: boolean, expandedMinHeight: number) {
  const hitSlop = 4;
  return {
    minHeight: dropActive ? expandedMinHeight : hitSlop,
    height: dropActive ? expandedMinHeight : hitSlop,
    overflow: "hidden",
    transition: "min-height 0.12s ease-out, height 0.12s ease-out, background-color 0.12s ease-out",
    listStyle: "none" as const,
    ...(dropActive && {
      boxShadow: `inset 0 2px 0 ${tokens.accent}`,
      bgcolor: "rgba(201, 162, 39, 0.06)",
    }),
  };
}

/** List trailing zone: only fills remaining space while hovered during a drag. */
export function cueListTrailingDropZoneSx(tokens: GscTokenSet, dropActive: boolean) {
  const hitSlop = 4;
  return {
    ...cueDropZoneSx(tokens, dropActive, 40),
    flex: dropActive ? 1 : "none",
    minHeight: dropActive ? 40 : hitSlop,
    height: dropActive ? undefined : hitSlop,
  };
}
