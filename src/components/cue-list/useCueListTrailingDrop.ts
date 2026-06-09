import { useCallback, useState } from "react";
import { useClearOnDragEnd } from "./useClearOnDragEnd";
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
import type { Cue } from "../../types/cue";
import { useCueListActions } from "./cueListActionsContext";

export function useCueListTrailingDrop(canEdit: boolean, allCues: Cue[]) {
  const { onCueReorder } = useCueListActions();
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
        const lastSibling = getLastSiblingOfCue(allCues, draggedCueId);
        if (lastSibling && lastSibling.id !== draggedCueId) {
          onCueReorder(draggedCueId, lastSibling.id, "after");
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
          applyAssetPayloads(payloads, { kind: "list" });
        } finally {
          setActiveAssetDrag(null);
        }
      })();
    },
    [allCues, canEdit, onCueReorder],
  );

  return {
    dropActive,
    onDragOver,
    onDragLeave,
    onDrop,
  };
}
