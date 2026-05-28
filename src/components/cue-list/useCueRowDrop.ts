import { useCallback, useRef, useState } from "react";
import {
  applyAssetPayloads,
  isExternalFileDrag,
  resolveAssetDropPayloads,
} from "../../lib/asset-drop";
import { cuesShareParent, isContainerCue } from "../../lib/cues";
import { pointerLeftElement } from "../../lib/dom";
import {
  isAssetDrag,
  isCueDrag,
  readCueDragId,
  setActiveAssetDrag,
  setActiveCueDrag,
} from "../../lib/drag";
import type { Cue } from "../../types/cue";

interface UseCueRowDropOptions {
  cue: Cue;
  allCues: Cue[];
  canEdit: boolean;
  onCueDrop: (cueId: string) => void;
  onCueReorder: (draggedId: string, targetId: string, place: "before" | "after") => void;
}

export function useCueRowDrop({
  cue,
  allCues,
  canEdit,
  onCueDrop,
  onCueReorder,
}: UseCueRowDropOptions) {
  const [dropActive, setDropActive] = useState(false);
  const [insertPlace, setInsertPlace] = useState<"before" | "after" | null>(null);
  const insertPlaceRef = useRef<"before" | "after" | null>(null);
  const isContainer = isContainerCue(cue);

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

      if (draggingCue && draggedCueId !== cue.id) {
        const dragged = allCues.find((c) => c.id === draggedCueId);
        if (dragged && isContainer) {
          e.dataTransfer.dropEffect = "move";
          insertPlaceRef.current = null;
          setInsertPlace(null);
          setDropActive(true);
          return;
        }
        if (dragged && cuesShareParent(dragged, cue)) {
          const rect = e.currentTarget.getBoundingClientRect();
          const place = e.clientY < rect.top + rect.height / 2 ? "before" : "after";
          e.dataTransfer.dropEffect = "move";
          insertPlaceRef.current = place;
          setInsertPlace(place);
          setDropActive(false);
          return;
        }
      }

      if (draggingAsset) {
        e.dataTransfer.dropEffect = isContainer ? "copy" : "link";
        insertPlaceRef.current = null;
        setInsertPlace(null);
        setDropActive(true);
      }
    },
    [allCues, canEdit, cue.id, isContainer, cue],
  );

  const onDragLeave = useCallback((e: React.DragEvent) => {
    if (pointerLeftElement(e.currentTarget, e.relatedTarget)) {
      setDropActive(false);
      insertPlaceRef.current = null;
      setInsertPlace(null);
    }
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!canEdit) return;

      setDropActive(false);
      const place = insertPlaceRef.current;
      insertPlaceRef.current = null;
      setInsertPlace(null);

      const draggedCueId = readCueDragId(e.dataTransfer);
      if (draggedCueId) {
        if (place && draggedCueId !== cue.id) {
          onCueReorder(draggedCueId, cue.id, place);
          setActiveCueDrag(null);
          return;
        }
        if (isContainer && draggedCueId !== cue.id) {
          onCueDrop(draggedCueId);
          setActiveCueDrag(null);
          return;
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
          if (!payloads.length) return;
          applyAssetPayloads(payloads, { kind: "row", cueId: cue.id });
        } finally {
          setActiveAssetDrag(null);
        }
      })();
    },
    [canEdit, cue.id, isContainer, onCueDrop, onCueReorder],
  );

  return {
    dropActive,
    insertPlace,
    onDragOver,
    onDragLeave,
    onDrop,
  };
}
