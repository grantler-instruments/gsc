import { useCallback, useState, type MouseEvent } from "react";
import { isUtilityCue } from "../../lib/cues";
import type { Cue } from "../../types/cue";
import type { CueContextMenuState } from "../CueContextMenu";
import { useProjectStore } from "../../stores/project";

export function useCueListContextMenu(
  cues: Cue[],
  canEdit: boolean,
  selectedCueIds: string[],
  selectedCueIdSet: Set<string>,
) {
  const selectCue = useProjectStore((s) => s.selectCue);
  const [contextMenu, setContextMenu] = useState<CueContextMenuState | null>(
    null,
  );

  const handleRowContextMenu = useCallback(
    (cueId: string, e: MouseEvent) => {
      if (!canEdit) return;
      e.preventDefault();
      e.stopPropagation();

      if (!selectedCueIdSet.has(cueId)) {
        selectCue(cueId);
      }

      setContextMenu({ mouseX: e.clientX, mouseY: e.clientY, cueId });
    },
    [canEdit, selectCue, selectedCueIdSet],
  );

  const contextMenuCue = contextMenu
    ? cues.find((c) => c.id === contextMenu.cueId)
    : undefined;
  const canRenameFromMenu =
    !!contextMenuCue &&
    selectedCueIds.length === 1 &&
    !isUtilityCue(contextMenuCue);

  return {
    contextMenu,
    setContextMenu,
    handleRowContextMenu,
    canRenameFromMenu,
  };
}
