import { useCallback, useState } from "react";
import { getChildCues } from "../../lib/cues";
import { pointerLeftElement } from "../../lib/dom";
import { isCueDrag, readCueDragId, setActiveCueDrag } from "../../lib/drag";
import { useCueListActions } from "./cueListActionsContext";
import { useClearOnDragEnd } from "./useClearOnDragEnd";

export type ContainerTrailingDropMode = "children-end" | "exit";

export function useCueContainerTrailingDrop(
  canEdit: boolean,
  containerId: string,
  mode: ContainerTrailingDropMode,
) {
  const { allCues, onCueDrop, onCueReparent } = useCueListActions();
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
      if (draggedCueId) {
        if (mode === "children-end") {
          const children = getChildCues(allCues, containerId);
          if (children.length === 0) {
            onCueDrop(draggedCueId, containerId);
          } else {
            const lastChild = children[children.length - 1];
            if (lastChild.id !== draggedCueId) {
              onCueReparent(draggedCueId, lastChild.id, "after");
            }
          }
        } else {
          onCueReparent(draggedCueId, containerId, "after");
        }
        setActiveCueDrag(null);
        return;
      }

      if (isCueDrag(e.dataTransfer)) {
        setActiveCueDrag(null);
      }
    },
    [allCues, canEdit, containerId, mode, onCueDrop, onCueReparent],
  );

  return {
    dropActive,
    onDragOver,
    onDragLeave,
    onDrop,
  };
}
