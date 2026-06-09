import { useEffect } from "react";

/** Clears drop-highlight state when any drag operation ends (drop, cancel, or leave window). */
export function useClearOnDragEnd(clear: () => void): void {
  useEffect(() => {
    window.addEventListener("dragend", clear);
    return () => window.removeEventListener("dragend", clear);
  }, [clear]);
}
