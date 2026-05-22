import {
  flattenVisibleCueIds,
  getPrimarySelectedCueId,
  isCueDescendantOf,
} from "./cue-selection";
import { isContainerCue } from "./cues";
import { canEditProject } from "./show-mode";
import { getActiveCueListFromState, useProjectStore } from "../stores/project";
import { useUiStore } from "../stores/ui";

/** Select next/previous cue in visible list order (respects collapsed groups). */
export function selectAdjacentVisibleCue(direction: 1 | -1): void {
  const list = getActiveCueListFromState(useProjectStore.getState());
  const collapsed = new Set(useUiStore.getState().collapsedCueGroupIds);
  const order = flattenVisibleCueIds(list.cues, collapsed);
  if (order.length === 0) return;

  const current = getPrimarySelectedCueId(list.selectedCueIds);
  let index = current ? order.indexOf(current) : -1;

  if (index === -1) {
    index = direction > 0 ? 0 : order.length - 1;
  } else {
    index = Math.max(0, Math.min(order.length - 1, index + direction));
  }

  useProjectStore.getState().selectCue(order[index]);
}

/**
 * After GO, select the next visible cue. Parallel/sequence containers skip
 * their visible children so the cursor lands on the cue after the group.
 */
export function selectNextCueAfterGo(triggeredCueId: string): void {
  const list = getActiveCueListFromState(useProjectStore.getState());
  const collapsed = new Set(useUiStore.getState().collapsedCueGroupIds);
  const order = flattenVisibleCueIds(list.cues, collapsed);
  const cues = list.cues;
  const triggered = cues.find((c) => c.id === triggeredCueId);
  if (!triggered) return;

  const startIndex = order.indexOf(triggeredCueId);
  if (startIndex === -1) return;

  const skipDescendantsOf = isContainerCue(triggered) ? triggeredCueId : null;

  for (let i = startIndex + 1; i < order.length; i++) {
    const id = order[i];
    if (
      skipDescendantsOf &&
      isCueDescendantOf(cues, skipDescendantsOf, id)
    ) {
      continue;
    }
    useProjectStore.getState().selectCue(id);
    return;
  }
}

/** Delete the primary selected cue and select a neighbor in the list when possible. */
export function deletePrimarySelectedCue(): void {
  if (!canEditProject()) return;
  const list = getActiveCueListFromState(useProjectStore.getState());
  const removeCue = useProjectStore.getState().removeCue;
  const selectCue = useProjectStore.getState().selectCue;
  const id = getPrimarySelectedCueId(list.selectedCueIds);
  if (!id) return;

  const collapsed = new Set(useUiStore.getState().collapsedCueGroupIds);
  const order = flattenVisibleCueIds(list.cues, collapsed);
  const index = order.indexOf(id);

  let nextId: string | null = null;
  if (index !== -1) {
    nextId = order[index + 1] ?? order[index - 1] ?? null;
  }

  removeCue(id);

  if (nextId) {
    selectCue(nextId);
  }
}
