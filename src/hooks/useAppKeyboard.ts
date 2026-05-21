import { useEffect } from "react";
import {
  deletePrimarySelectedCue,
  selectAdjacentVisibleCue,
} from "../lib/cue-navigation";
import { isEditableKeyboardTarget } from "../lib/keyboard";
import { canEditProject } from "../lib/show-mode";
import { triggerGoSelected } from "../lib/transport-actions";
import { useProjectStore } from "../stores/project";
import { useTransportStore } from "../stores/transport";
import { useUiStore } from "../stores/ui";

export function useAppKeyboard(): void {
  const groupSelectedCues = useProjectStore((s) => s.groupSelectedCues);
  const copySelectedCues = useProjectStore((s) => s.copySelectedCues);
  const pasteSelectedCues = useProjectStore((s) => s.pasteSelectedCues);
  const duplicateSelectedCues = useProjectStore((s) => s.duplicateSelectedCues);
  const toggleShowMode = useUiStore((s) => s.toggleShowMode);
  const panic = useTransportStore((s) => s.panic);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (isEditableKeyboardTarget(e.target)) return;

      if (e.code === "Space") {
        e.preventDefault();
        triggerGoSelected();
        return;
      }

      if (e.key === "Escape") {
        panic();
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

      if (e.key === "Backspace") {
        e.preventDefault();
        deletePrimarySelectedCue();
        return;
      }

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "e") {
        e.preventDefault();
        toggleShowMode();
        return;
      }

      if (
        canEditProject() &&
        (e.metaKey || e.ctrlKey) &&
        e.key.toLowerCase() === "c" &&
        !e.shiftKey
      ) {
        if (copySelectedCues()) {
          e.preventDefault();
        }
        return;
      }

      if (
        canEditProject() &&
        (e.metaKey || e.ctrlKey) &&
        e.key.toLowerCase() === "v" &&
        !e.shiftKey
      ) {
        if (pasteSelectedCues()) {
          e.preventDefault();
        }
        return;
      }

      if (
        canEditProject() &&
        (e.metaKey || e.ctrlKey) &&
        e.key.toLowerCase() === "d" &&
        !e.shiftKey
      ) {
        if (duplicateSelectedCues()) {
          e.preventDefault();
        }
        return;
      }

      if (
        canEditProject() &&
        (e.metaKey || e.ctrlKey) &&
        e.key.toLowerCase() === "g"
      ) {
        e.preventDefault();
        groupSelectedCues();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [copySelectedCues, duplicateSelectedCues, groupSelectedCues, panic, pasteSelectedCues, toggleShowMode]);
}
