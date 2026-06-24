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

/**
 * List trailing zone: empty space at the end of the cue list that always fills the
 * remaining area, giving an obvious place to drop assets or cues (e.g. for
 * reordering to the end). It subtly highlights while hovered during a drag.
 */
export function cueListTrailingDropZoneSx(tokens: GscTokenSet, dropActive: boolean) {
  return {
    flex: 1,
    minHeight: 48,
    listStyle: "none" as const,
    transition: "background-color 0.12s ease-out, box-shadow 0.12s ease-out",
    ...(dropActive && {
      boxShadow: `inset 0 2px 0 ${tokens.accent}`,
      bgcolor: "rgba(201, 162, 39, 0.06)",
    }),
  };
}
