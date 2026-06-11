import { useCallback, useState } from "react";
import {
  applyAssetPayloads,
  isAssetDropDrag,
  isExternalFileDrag,
  resolveAssetDropPayloads,
} from "../../lib/asset-drop";
import { pointerLeftElement } from "../../lib/dom";
import {
  isAssetDrag,
  isCueDrag,
  readCueDragData,
  readCueDragId,
  setActiveAssetDrag,
  setActiveCueDrag,
} from "../../lib/drag";
import { useProjectStore } from "../../stores/project";
import { useClearOnDragEnd } from "./useClearOnDragEnd";

export function useCueListDrop(canEdit: boolean) {
  const moveCueToGroup = useProjectStore((s) => s.moveCueToGroup);
  const [listDropActive, setListDropActive] = useState(false);

  const clearListDropActive = useCallback(() => setListDropActive(false), []);
  useClearOnDragEnd(clearListDropActive);

  const onListDragOver = useCallback(
    (e: React.DragEvent) => {
      if (!canEdit) return;
      if (!isAssetDropDrag(e.dataTransfer) && !isCueDrag(e.dataTransfer)) {
        return;
      }
      e.preventDefault();
      e.dataTransfer.dropEffect = isCueDrag(e.dataTransfer) ? "move" : "copy";
      setListDropActive(true);
    },
    [canEdit],
  );

  const onListDragLeave = useCallback((e: React.DragEvent) => {
    if (pointerLeftElement(e.currentTarget, e.relatedTarget)) {
      setListDropActive(false);
    }
  }, []);

  const onListDrop = useCallback(
    (e: React.DragEvent) => {
      setListDropActive(false);
      e.preventDefault();
      if (!canEdit) return;

      const cuePayload = readCueDragData(e.dataTransfer);
      const draggedCueId =
        cuePayload?.cueId ?? (isCueDrag(e.dataTransfer) ? readCueDragId(e.dataTransfer) : null);
      if (draggedCueId) {
        if (e.target === e.currentTarget) {
          moveCueToGroup(draggedCueId, null);
        }
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
    [canEdit, moveCueToGroup],
  );

  const onListDropCapture = clearListDropActive;

  return {
    listDropActive,
    onListDragOver,
    onListDragLeave,
    onListDrop,
    onListDropCapture,
  };
}
