import { getMainSequenceListFromState, useProjectStore } from "../stores/project";
import { useUiStore } from "../stores/ui";
import { flattenVisibleCueIds, getPrimarySelectedCueId, isCueDescendantOf } from "./cue-selection";
import { isContainerCue } from "./cues";
import { canEditProject } from "./show-mode";

/** Select next/previous cue in the main sequence list (keyboard). */
export function selectAdjacentVisibleCue(direction: 1 | -1): void {
  const state = useProjectStore.getState();
  const list = getMainSequenceListFromState(state);
  if (!list) return;
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

  useProjectStore.getState().selectCueInList(list.id, order[index]);
}

/**
 * After GO, select the next visible cue. Parallel/sequence containers skip
 * their visible children so the cursor lands on the cue after the group.
 */
export function selectNextCueAfterGo(triggeredCueId: string, listId?: string): void {
  const state = useProjectStore.getState();
  const list =
    (listId ? state.cueLists.find((l) => l.id === listId) : undefined) ??
    state.cueLists.find((l) => l.cues.some((c) => c.id === triggeredCueId)) ??
    getMainSequenceListFromState(state);
  if (!list) return;
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
    if (skipDescendantsOf && isCueDescendantOf(cues, skipDescendantsOf, id)) {
      continue;
    }
    useProjectStore.getState().selectCueInList(list.id, id);
    return;
  }

  advanceToNextCueListTab(list.id);
}

/** Select the next cue in the main sequence list (container-aware; mirrors post-GO advance). */
export function selectNextCue(): void {
  const list = getMainSequenceListFromState(useProjectStore.getState());
  if (!list) return;
  const collapsed = new Set(useUiStore.getState().collapsedCueGroupIds);
  const order = flattenVisibleCueIds(list.cues, collapsed);
  if (order.length === 0) return;

  const current = getPrimarySelectedCueId(list.selectedCueIds);
  if (!current) {
    useProjectStore.getState().selectCueInList(list.id, order[0]);
    return;
  }

  selectNextCueAfterGo(current, list.id);
}

/**
 * Select the previous cue in the main sequence list. When approaching a container
 * from outside, land on the shallowest containing group instead of its last visible child.
 */
export function selectPreviousCue(): void {
  const list = getMainSequenceListFromState(useProjectStore.getState());
  if (!list) return;
  const collapsed = new Set(useUiStore.getState().collapsedCueGroupIds);
  const order = flattenVisibleCueIds(list.cues, collapsed);
  if (order.length === 0) return;

  const cues = list.cues;
  const current = getPrimarySelectedCueId(list.selectedCueIds);
  if (!current) {
    useProjectStore.getState().selectCueInList(list.id, order[order.length - 1]);
    return;
  }

  const index = order.indexOf(current);
  if (index <= 0) return;

  const prevId = order[index - 1];
  let shallowest: string | null = null;

  let parentId = cues.find((c) => c.id === prevId)?.parentId;
  while (parentId) {
    const parent = cues.find((c) => c.id === parentId);
    if (
      parent &&
      isContainerCue(parent) &&
      isCueDescendantOf(cues, parent.id, prevId) &&
      !isCueDescendantOf(cues, parent.id, current)
    ) {
      shallowest = parent.id;
    }
    parentId = parent?.parentId;
  }

  useProjectStore.getState().selectCueInList(list.id, shallowest ?? prevId);
}

/** After the last cue in a list, switch to the next sequence tab and select its first visible cue. */
function advanceToNextCueListTab(currentListId: string): void {
  const state = useProjectStore.getState();
  const sequenceLists = state.cueLists.filter((l) => l.kind !== "hot");
  const currentIndex = sequenceLists.findIndex((l) => l.id === currentListId);
  if (currentIndex === -1 || currentIndex >= sequenceLists.length - 1) return;

  const nextList = sequenceLists[currentIndex + 1];
  state.setActiveCueList(nextList.id);

  const collapsed = new Set(useUiStore.getState().collapsedCueGroupIds);
  const nextOrder = flattenVisibleCueIds(nextList.cues, collapsed);
  if (nextOrder.length > 0) {
    state.selectCueInList(nextList.id, nextOrder[0]);
  }
}

/** Delete the primary selected cue and select a neighbor in the list when possible. */
export function deletePrimarySelectedCue(): void {
  if (!canEditProject()) return;
  const state = useProjectStore.getState();
  const list = getMainSequenceListFromState(state);
  if (!list) return;
  const removeCueFromList = state.removeCueFromList;
  const selectCueInList = state.selectCueInList;
  const id = getPrimarySelectedCueId(list.selectedCueIds);
  if (!id) return;

  const collapsed = new Set(useUiStore.getState().collapsedCueGroupIds);
  const order = flattenVisibleCueIds(list.cues, collapsed);
  const index = order.indexOf(id);

  let nextId: string | null = null;
  if (index !== -1) {
    nextId = order[index + 1] ?? order[index - 1] ?? null;
  }

  removeCueFromList(list.id, id);

  if (nextId) {
    selectCueInList(list.id, nextId);
  }
}
