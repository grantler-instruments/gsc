import { useEffect, useState } from "react";
import { GSC_CUE_DRAG_TYPE, getActiveCueDragId } from "../../lib/drag";

function isCueDragEvent(event: Event): event is DragEvent {
  return event instanceof DragEvent && !!event.dataTransfer?.types.includes(GSC_CUE_DRAG_TYPE);
}

/** True while a cue row is being dragged in the cue list. */
export function useCueDragActive(): boolean {
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    const onDragStart = (event: Event) => {
      if (isCueDragEvent(event)) {
        setDragging(true);
        return;
      }
      // CueRow stops dragstart propagation after setting active drag state.
      requestAnimationFrame(() => {
        if (getActiveCueDragId() !== null) {
          setDragging(true);
        }
      });
    };

    const onDragEnd = () => {
      setDragging(false);
    };

    window.addEventListener("dragstart", onDragStart, true);
    window.addEventListener("dragend", onDragEnd);
    window.addEventListener("drop", onDragEnd);

    return () => {
      window.removeEventListener("dragstart", onDragStart, true);
      window.removeEventListener("dragend", onDragEnd);
      window.removeEventListener("drop", onDragEnd);
    };
  }, []);

  return dragging;
}
