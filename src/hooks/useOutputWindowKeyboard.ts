import { useEffect } from "react";
import { toggleWindowFullscreen } from "../platform/window-fullscreen";

/** Keyboard shortcuts for the audience output window. */
export function useOutputWindowKeyboard(): void {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "f" && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        void toggleWindowFullscreen();
      }
    };

    document.addEventListener("keydown", onKeyDown, true);
    return () => document.removeEventListener("keydown", onKeyDown, true);
  }, []);
}
