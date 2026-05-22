import { useCallback, useMemo, type MouseEvent } from "react";
import {
  flattenVisibleCueIds,
  getPrimarySelectedCueId,
} from "../../lib/cue-selection";
import type { Cue } from "../../types/cue";
import { getActiveCueListFromState, useProjectStore } from "../../stores/project";

export function useCueListSelection(
  cues: Cue[],
  collapsedGroups: Set<string>,
) {
  const selectedCueIds = useProjectStore(
    (s) => getActiveCueListFromState(s).selectedCueIds,
  );
  const selectCue = useProjectStore((s) => s.selectCue);
  const toggleSelectCue = useProjectStore((s) => s.toggleSelectCue);
  const selectCueRange = useProjectStore((s) => s.selectCueRange);

  const primarySelectedId = getPrimarySelectedCueId(selectedCueIds);
  const selectedCueIdSet = useMemo(
    () => new Set(selectedCueIds),
    [selectedCueIds],
  );

  const visibleCueOrder = useMemo(
    () => flattenVisibleCueIds(cues, collapsedGroups),
    [cues, collapsedGroups],
  );

  const handleRowSelect = useCallback(
    (cueId: string, e: MouseEvent) => {
      if (e.shiftKey) {
        selectCueRange(cueId, visibleCueOrder);
      } else if (e.metaKey || e.ctrlKey) {
        toggleSelectCue(cueId);
      } else {
        selectCue(cueId);
      }
    },
    [selectCue, selectCueRange, toggleSelectCue, visibleCueOrder],
  );

  return {
    selectedCueIds,
    primarySelectedId,
    selectedCueIdSet,
    handleRowSelect,
  };
}
