import { useEffect } from "react";
import { deletePrimarySelectedCue, selectAdjacentVisibleCue } from "../lib/cue-navigation";
import { hasTextSelection, isEditableKeyboardTarget } from "../lib/keyboard";
import { startNewProject } from "../lib/new-project";
import { openSettings } from "../lib/open-settings";
import { openProjectFile, saveProjectAsFile } from "../lib/project-file-actions";
import { redoProjectEdit, undoProjectEdit } from "../lib/project-history";
import { saveKeyboardAction } from "../lib/project-save-flow";
import { canEditProject } from "../lib/show-mode";
import { triggerGoSelected } from "../lib/transport-actions";
import { getPlatform } from "../platform";
import { toggleWindowFullscreen } from "../platform/window-fullscreen";
import { useProjectStore } from "../stores/project";
import { useProjectLocationStore } from "../stores/project-location";
import { useTransportStore } from "../stores/transport";
import { useUiStore } from "../stores/ui";

export function useAppKeyboard(): void {
  const groupSelectedCues = useProjectStore((s) => s.groupSelectedCues);
  const copySelectedCues = useProjectStore((s) => s.copySelectedCues);
  const cutSelectedCues = useProjectStore((s) => s.cutSelectedCues);
  const pasteSelectedCues = useProjectStore((s) => s.pasteSelectedCues);
  const duplicateSelectedCues = useProjectStore((s) => s.duplicateSelectedCues);
  const toggleShowMode = useUiStore((s) => s.toggleShowMode);
  const panic = useTransportStore((s) => s.panic);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "n" && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        void startNewProject();
        return;
      }

      if ((e.metaKey || e.ctrlKey) && e.key === "," && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        openSettings();
        return;
      }

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "o" && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        if (canEditProject()) void openProjectFile();
        return;
      }

      if (
        saveKeyboardAction({
          key: e.key,
          metaOrCtrl: e.metaKey || e.ctrlKey,
          shift: e.shiftKey,
          alt: e.altKey,
          canEdit: canEditProject(),
          platform: getPlatform(),
          isTemporaryRoot: useProjectLocationStore.getState().isTemporaryRoot,
        }) === "save-as"
      ) {
        e.preventDefault();
        void saveProjectAsFile();
        return;
      }

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "f" && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        void toggleWindowFullscreen();
        return;
      }

      if (
        canEditProject() &&
        (e.metaKey || e.ctrlKey) &&
        e.key.toLowerCase() === "z" &&
        !isEditableKeyboardTarget(e.target)
      ) {
        if (e.shiftKey) {
          if (redoProjectEdit()) {
            e.preventDefault();
          }
        } else if (undoProjectEdit()) {
          e.preventDefault();
        }
        return;
      }

      if (isEditableKeyboardTarget(e.target)) return;

      if (e.code === "Space") {
        e.preventDefault();
        triggerGoSelected();
        return;
      }

      if (e.key === "Escape") {
        if (useUiStore.getState().compactInspectorDrawerOpen) {
          return;
        }
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
        !hasTextSelection() &&
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
        !hasTextSelection() &&
        canEditProject() &&
        (e.metaKey || e.ctrlKey) &&
        e.key.toLowerCase() === "x" &&
        !e.shiftKey
      ) {
        if (cutSelectedCues()) {
          e.preventDefault();
        }
        return;
      }

      if (
        !hasTextSelection() &&
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

      if (canEditProject() && (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "g") {
        e.preventDefault();
        groupSelectedCues();
      }
    };

    document.addEventListener("keydown", onKeyDown, true);
    return () => document.removeEventListener("keydown", onKeyDown, true);
  }, [
    copySelectedCues,
    cutSelectedCues,
    duplicateSelectedCues,
    groupSelectedCues,
    panic,
    pasteSelectedCues,
    toggleShowMode,
  ]);
}
