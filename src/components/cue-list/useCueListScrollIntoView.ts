import { useLayoutEffect } from "react";
import { GSC_CUE_ID } from "../../lib/tauri-drop";

function scrollPrimarySelectedCueIntoView(cueId: string): void {
  const row = document.querySelector(`[${GSC_CUE_ID}="${CSS.escape(cueId)}"]`);
  row?.scrollIntoView({ block: "nearest", inline: "nearest" });
}

/** Keep the primary selected cue row visible inside the cue list scroller. */
export function useCueListScrollIntoView(primarySelectedId: string | null): void {
  useLayoutEffect(() => {
    if (!primarySelectedId) return;

    scrollPrimarySelectedCueIntoView(primarySelectedId);

    // Row may not be mounted yet on the same frame as selection changes.
    const rafId = requestAnimationFrame(() => {
      scrollPrimarySelectedCueIntoView(primarySelectedId);
    });
    return () => cancelAnimationFrame(rafId);
  }, [primarySelectedId]);
}
