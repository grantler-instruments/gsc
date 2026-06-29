import { useCallback, useRef, useState } from "react";
import {
  applyAssetPayloads,
  isExternalFileDrag,
  resolveAssetDropPayloads,
} from "../../lib/asset-drop";
import { findCueInLists } from "../../lib/cue-lists";
import { getChildCues, isContainerCue } from "../../lib/cues";
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
import {
  type ContainerRowDropMode,
  computeContainerRowDropMode,
  computeInsertPlace,
  readCueRowDropTarget,
} from "./cueDropPlacement";
import { useClearOnDragEnd } from "./useClearOnDragEnd";

interface UseCueRowDropOptions {
  cue: Cue;
  listId: string;
  allCues: Cue[];
  canEdit: boolean;
  onCueDrop: (cueId: string) => void;
  onCueReparent: (draggedId: string, targetId: string, place: "before" | "after") => void;
}

export function useCueRowDrop({
  cue,
  listId,
  allCues,
  canEdit,
  onCueDrop,
  onCueReparent,
}: UseCueRowDropOptions) {
  const moveCueToList = useProjectStore((s) => s.moveCueToList);
  const [dropActive, setDropActive] = useState(false);
  const [insertPlace, setInsertPlace] = useState<"before" | "after" | null>(null);
  const insertPlaceRef = useRef<ContainerRowDropMode | null>(null);
  const isContainer = isContainerCue(cue);

  const clearDropHighlight = useCallback(() => {
    setDropActive(false);
    insertPlaceRef.current = null;
    setInsertPlace(null);
  }, []);
  useClearOnDragEnd(clearDropHighlight);

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
        const source = findCueInLists(useProjectStore.getState().cueLists, draggedCueId);
        const crossList = source?.list.id !== listId;
        const dragged = allCues.find((c) => c.id === draggedCueId) ?? source?.cue;
        if (!dragged) return;
        if (dragged && isContainer) {
          const mode = computeContainerRowDropMode(e, null);
          e.dataTransfer.dropEffect = "move";
          if (mode === "into") {
            insertPlaceRef.current = "into";
            setInsertPlace(null);
            setDropActive(true);
          } else {
            insertPlaceRef.current = mode;
            setInsertPlace(mode);
            setDropActive(false);
          }
          return;
        }
        if (dragged && (crossList || dragged.parentId === cue.parentId)) {
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
    [allCues, canEdit, cue.id, cue.parentId, isContainer, listId],
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
      const cachedMode = insertPlaceRef.current;
      insertPlaceRef.current = null;
      setInsertPlace(null);

      const draggedCueId = readCueDragId(e.dataTransfer);
      if (draggedCueId) {
        const source = findCueInLists(useProjectStore.getState().cueLists, draggedCueId);
        if (source && source.list.id !== listId) {
          if (isContainer && draggedCueId !== cue.id) {
            moveCueToList(draggedCueId, listId, { kind: "into-group", groupId: cue.id });
          } else {
            const place = computeInsertPlace(
              e,
              cachedMode === "before" || cachedMode === "after" ? cachedMode : null,
            );
            if (draggedCueId !== cue.id) {
              moveCueToList(draggedCueId, listId, { kind: place, cueId: cue.id });
            }
          }
          setActiveCueDrag(null);
          return;
        }

        if (isContainer && draggedCueId !== cue.id) {
          const mode = computeContainerRowDropMode(e, cachedMode === "into" ? "into" : cachedMode);
          if (mode === "before" || mode === "after") {
            onCueReparent(draggedCueId, cue.id, mode);
          } else {
            const children = getChildCues(allCues, cue.id);
            if (children.length === 0) {
              onCueDrop(draggedCueId);
            } else {
              const rowTarget = readCueRowDropTarget(e);
              const childTarget =
                rowTarget &&
                rowTarget.cueId !== cue.id &&
                children.some((child) => child.id === rowTarget.cueId)
                  ? rowTarget
                  : null;
              if (childTarget) {
                onCueReparent(draggedCueId, childTarget.cueId, childTarget.place);
              } else {
                const lastChild = children[children.length - 1];
                if (lastChild.id !== draggedCueId) {
                  onCueReparent(draggedCueId, lastChild.id, "after");
                }
              }
            }
          }
          setActiveCueDrag(null);
          return;
        }

        const place = computeInsertPlace(
          e,
          cachedMode === "before" || cachedMode === "after" ? cachedMode : null,
        );
        if (draggedCueId !== cue.id) {
          onCueReparent(draggedCueId, cue.id, place);
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
          applyAssetPayloads(payloads, { kind: "row", listId, cueId: cue.id });
        } finally {
          setActiveAssetDrag(null);
        }
      })();
    },
    [allCues, canEdit, cue.id, isContainer, listId, moveCueToList, onCueDrop, onCueReparent],
  );

  return {
    dropActive,
    insertPlace,
    onDragOver,
    onDragLeave,
    onDrop,
  };
}
