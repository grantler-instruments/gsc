import { useCallback, useState } from "react";
import { pointerLeftElement } from "../../lib/dom";
import { isCueDrag, readCueDragId, setActiveCueDrag } from "../../lib/drag";
import { useCueListActions } from "./cueListActionsContext";
import { useClearOnDragEnd } from "./useClearOnDragEnd";

export function useCueContainerLeadingDrop(
  canEdit: boolean,
  _containerId: string,
  firstChildId: string,
) {
  const { onCueReparent } = useCueListActions();
  const [dropActive, setDropActive] = useState(false);

  const clearDropActive = useCallback(() => setDropActive(false), []);
  useClearOnDragEnd(clearDropActive);

  const onDragOver = useCallback(
    (e: React.DragEvent) => {
      if (!canEdit) return;
      const draggedCueId = readCueDragId(e.dataTransfer);
      if (draggedCueId === null) return;

      e.preventDefault();
      e.stopPropagation();
      e.dataTransfer.dropEffect = "move";
      setDropActive(true);
    },
    [canEdit],
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
      if (draggedCueId && draggedCueId !== firstChildId) {
        onCueReparent(draggedCueId, firstChildId, "before");
        setActiveCueDrag(null);
        return;
      }

      if (isCueDrag(e.dataTransfer)) {
        setActiveCueDrag(null);
      }
    },
    [canEdit, firstChildId, onCueReparent],
  );

  return {
    dropActive,
    onDragOver,
    onDragLeave,
    onDrop,
  };
}
