import { useCallback, useState } from "react";
import {
  applyAssetPayloads,
  isExternalFileDrag,
  resolveAssetDropPayloads,
} from "../../lib/asset-drop";
import { findCueInLists } from "../../lib/cue-lists";
import { getLastSiblingOfCue } from "../../lib/cues";
import { pointerLeftElement } from "../../lib/dom";
import {
  isAssetDrag,
  isCueDrag,
  readCueDragId,
  setActiveAssetDrag,
  setActiveCueDrag,
} from "../../lib/drag";
import { useProjectStore } from "../../stores/project";
import type { Cue } from "../../types/cue";
import { useCueListActions } from "./cueListActionsContext";
import { useClearOnDragEnd } from "./useClearOnDragEnd";

export function useCueListTrailingDrop(canEdit: boolean, allCues: Cue[]) {
  const { listId, onCueReparent, onCueReparentToListEnd } = useCueListActions();
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

        const dragged = allCues.find((c) => c.id === draggedCueId);
        if (dragged?.parentId) {
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
    [allCues, canEdit, listId],
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
          setActiveCueDrag(null);
          return;
        }

        const dragged = allCues.find((c) => c.id === draggedCueId);
        if (dragged?.parentId) {
          onCueReparentToListEnd(draggedCueId);
          setActiveCueDrag(null);
          return;
        }

        const lastSibling = getLastSiblingOfCue(allCues, draggedCueId);
        if (lastSibling && lastSibling.id !== draggedCueId) {
          onCueReparent(draggedCueId, lastSibling.id, "after");
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
    [allCues, canEdit, listId, moveCueToList, onCueReparent, onCueReparentToListEnd],
  );

  return {
    dropActive,
    onDragOver,
    onDragLeave,
    onDrop,
  };
}
