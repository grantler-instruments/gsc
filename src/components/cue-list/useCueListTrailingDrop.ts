import { useCallback, useState } from "react";
import { isExternalFileDrag, resolveAssetDropPayloads } from "../../lib/asset-drop";
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

export function useCueListTrailingDrop(canEdit: boolean, allCues: Cue[]) {
  const addCue = useProjectStore((s) => s.addCue);
  const { onCueReorder } = useCueListActions();
  const [dropActive, setDropActive] = useState(false);

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
          for (const payload of payloads) {
            addCue({
              name: payload.name,
              type: payload.kind,
              assetPath: payload.path,
            });
          }
        } finally {
          setActiveAssetDrag(null);
        }
      })();
    },
    [addCue, allCues, canEdit, onCueReorder],
  );

  return {
    dropActive,
    onDragOver,
    onDragLeave,
    onDrop,
  };
}
