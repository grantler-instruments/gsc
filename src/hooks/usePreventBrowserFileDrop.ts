import { useEffect } from "react";
import { isExternalFileDrag } from "../lib/asset-drop";

/**
 * Stop the browser from navigating to / opening dropped files (common in
 * Chrome/Brave). Drop targets still handle import via their own handlers.
 */
export function usePreventBrowserFileDrop(): void {
  useEffect(() => {
    const allowDrop = (e: DragEvent) => {
      if (!e.dataTransfer || !isExternalFileDrag(e.dataTransfer)) return;
      e.preventDefault();
    };

    const blockOpen = (e: DragEvent) => {
      if (!e.dataTransfer || !isExternalFileDrag(e.dataTransfer)) return;
      e.preventDefault();
    };

    window.addEventListener("dragover", allowDrop, true);
    window.addEventListener("drop", blockOpen, true);

    return () => {
      window.removeEventListener("dragover", allowDrop, true);
      window.removeEventListener("drop", blockOpen, true);
    };
  }, []);
}
