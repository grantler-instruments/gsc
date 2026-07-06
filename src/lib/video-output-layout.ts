export const DEFAULT_VIDEO_OUTPUT_DOCK_HEIGHT = 220;
export const MIN_VIDEO_OUTPUT_DOCK_HEIGHT = 140;
export const MAX_VIDEO_OUTPUT_DOCK_HEIGHT = 420;

/** Space reserved for toolbar, transport bar, and minimum cue list area. */
const DOCK_HEIGHT_VIEWPORT_MARGIN = 160;

export function clampVideoOutputDockHeight(height: number): number {
  const maxHeight =
    typeof window === "undefined"
      ? MAX_VIDEO_OUTPUT_DOCK_HEIGHT
      : Math.max(
          MIN_VIDEO_OUTPUT_DOCK_HEIGHT,
          Math.min(MAX_VIDEO_OUTPUT_DOCK_HEIGHT, window.innerHeight - DOCK_HEIGHT_VIEWPORT_MARGIN),
        );

  return Math.round(Math.max(MIN_VIDEO_OUTPUT_DOCK_HEIGHT, Math.min(maxHeight, height)));
}
