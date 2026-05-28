import { useEffect } from "react";
import { selectAdjacentVisibleCue } from "../lib/cue-navigation";
import { isEditableKeyboardTarget } from "../lib/keyboard";
import { getRemoteConnectionState, sendRemoteCommand } from "../lib/remote-client";
import { triggerGoSelected } from "../lib/transport-actions";

/** Show-mode keyboard shortcuts for the phone/tablet remote (Space = GO, etc.). */
export function useRemoteKeyboard(): void {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (getRemoteConnectionState() !== "connected") return;
      if (isEditableKeyboardTarget(e.target)) return;

      if (e.code === "Space") {
        e.preventDefault();
        triggerGoSelected();
        return;
      }

      if (e.key === "Escape") {
        e.preventDefault();
        sendRemoteCommand({ action: "panic" });
        return;
      }

      if (e.key === "ArrowDown") {
        e.preventDefault();
        selectAdjacentVisibleCue(1);
        return;
      }

      if (e.key === "ArrowUp") {
        e.preventDefault();
        selectAdjacentVisibleCue(-1);
        return;
      }
    };

    document.addEventListener("keydown", onKeyDown, true);
    return () => document.removeEventListener("keydown", onKeyDown, true);
  }, []);
}
