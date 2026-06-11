import { useCallback, useState } from "react";
import {
  applyAssetPayloads,
  isExternalFileDrag,
  resolveAssetDropPayloads,
} from "../../lib/asset-drop";
import { getLastSiblingOfCue } from "../../lib/cues";
import { pointerLeftElement } from "../../lib/dom";
import {
  isAssetDrag,
  isCueDrag,
  readCueDragId,
  setActiveAssetDrag,
  setActiveCueDrag,
} from "../../lib/drag";
import { findCueInLists } from "../../lib/cue-lists";
import { useProjectStore } from "../../stores/project";
import type { Cue } from "../../types/cue";
import { useCueListActions } from "./cueListActionsContext";
import { useClearOnDragEnd } from "./useClearOnDragEnd";

export function useCueListTrailingDrop(canEdit: boolean, allCues: Cue[]) {
  const { listId, onCueReorder } = useCueListActions();
  const moveCueToList = useProjectStore((s) => s.moveCueToList);
  const [dropActive, setDropActive] = useState(false);

  const clearDropActive = useCallback(() => setDropActive(false), []);
  useClearOnDragEnd(clearDropActive);

  const onDragOver = useCallback(
    (e: React.DragEvent) => {
      if (!canEdit) return;

      const draggedCueId = readCueDragId(e.dataTransfer);
      const draggingCue = draggedCueId !== null;
      const draggingAsset =
        !draggingCue && (isAssetDrag(e.dataTransfer) || isExternalFileDrag(e.dataTransfer));
      if (!draggingCue && !draggingAsset) return;

      e.preventDefault();
      e.stopPropagation();

      if (draggingCue) {
        const source = findCueInLists(useProjectStore.getState().cueLists, draggedCueId);
        if (source && source.list.id !== listId) {
          e.dataTransfer.dropEffect = "move";
          setDropActive(true);
          return;
        }
        const lastSibling = getLastSiblingOfCue(allCues, draggedCueId);
        if (!lastSibling || lastSibling.id === draggedCueId) {
          setDropActive(false);
          return;
        }
        e.dataTransfer.dropEffect = "move";
        setDropActive(true);
        return;
      }

      e.dataTransfer.dropEffect = "copy";
      setDropActive(true);
    },
    [allCues, canEdit],
  );

  const onDragLeave = useCallback((e: React.DragEvent) => {
    if (pointerLeftElement(e.currentTarget, e.relatedTarget)) {
      setDropActive(false);
    }
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDropActive(false);
      if (!canEdit) return;

      const draggedCueId = readCueDragId(e.dataTransfer);
      if (draggedCueId) {
        const source = findCueInLists(useProjectStore.getState().cueLists, draggedCueId);
        if (source && source.list.id !== listId) {
          moveCueToList(draggedCueId, listId, { kind: "append" });
        } else {
          const lastSibling = getLastSiblingOfCue(allCues, draggedCueId);
          if (lastSibling && lastSibling.id !== draggedCueId) {
            onCueReorder(draggedCueId, lastSibling.id, "after");
          }
        }
        setActiveCueDrag(null);
        return;
      }

      if (isCueDrag(e.dataTransfer)) {
        setActiveCueDrag(null);
        return;
      }

      if (!isAssetDrag(e.dataTransfer) && !isExternalFileDrag(e.dataTransfer)) {
        return;
      }

      void (async () => {
        try {
          const payloads = await resolveAssetDropPayloads(e.dataTransfer);
          applyAssetPayloads(payloads, { kind: "list", listId });
        } finally {
          setActiveAssetDrag(null);
        }
      })();
    },
    [allCues, canEdit, listId, moveCueToList, onCueReorder],
  );

  return {
    dropActive,
    onDragOver,
    onDragLeave,
    onDrop,
  };
}
