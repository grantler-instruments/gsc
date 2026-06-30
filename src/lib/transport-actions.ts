import { isRemoteClient } from "../platform/remote-mode";
import {
  getActiveCueListFromState,
  getMainSequenceListFromState,
  useProjectStore,
} from "../stores/project";
import { useTransportStore } from "../stores/transport";
import type { Cue } from "../types/cue";
import { selectNextCueAfterGo } from "./cue-navigation";
import { getPrimarySelectedCueId } from "./cue-selection";
import { sendRemoteCommand } from "./remote-client";
import { triggerGo } from "./trigger";

export function triggerGoAndAdvance(cue: Cue): void {
  if (isRemoteClient()) {
    sendRemoteCommand({ action: "go", cueId: cue.id });
    return;
  }
  const state = useProjectStore.getState();
  const list =
    state.cueLists.find((l) => l.cues.some((c) => c.id === cue.id)) ??
    getMainSequenceListFromState(state);
  if (!list) return;
  const transport = useTransportStore.getState();
  triggerGo(cue, list.cues, {
    go: transport.go,
    goMany: transport.goMany,
    stopMany: transport.stopMany,
  });
  selectNextCueAfterGo(cue.id, list.id);
}

function allProjectCues(): Cue[] {
  return useProjectStore.getState().cueLists.flatMap((l) => l.cues);
}

/**
 * Fire a hot cue as an overlay: layers on top of the main list without moving
 * the editor selection and without cancelling main-list sequences.
 */
export function triggerHotCue(cue: Cue): void {
  if (isRemoteClient()) {
    sendRemoteCommand({ action: "hot-go", cueId: cue.id });
    return;
  }
  const transport = useTransportStore.getState();
  triggerGo(
    cue,
    allProjectCues(),
    {
      go: transport.go,
      goMany: transport.goMany,
      stopMany: transport.stopMany,
    },
    { sequenceScope: "overlay" },
  );
}

function resolveMainGoTargetCueId(): string | null {
  const list = getMainSequenceListFromState(useProjectStore.getState());
  if (!list) return null;
  const selectedCueId = getPrimarySelectedCueId(list.selectedCueIds);
  return selectedCueId ?? list.cues.find((c) => !c.parentId)?.id ?? null;
}

/** Hot cue selected while the hot list has edit focus. */
export function resolveHotGoTargetCue(): Cue | null {
  const active = getActiveCueListFromState(useProjectStore.getState());
  if (active.kind !== "hot") return null;
  const selectedId = getPrimarySelectedCueId(active.selectedCueIds);
  if (!selectedId) return null;
  return active.cues.find((c) => c.id === selectedId) ?? null;
}

/** Return edit focus to the main sequence list and restore its selection. */
export function focusMainCueList(): void {
  const state = useProjectStore.getState();
  const main = getMainSequenceListFromState(state);
  if (!main) return;
  const mainSelectedId = getPrimarySelectedCueId(main.selectedCueIds);
  state.setActiveCueList(main.id);
  if (mainSelectedId) {
    useProjectStore.getState().selectCue(mainSelectedId);
  }
}

function restoreMainListFocusOnRemote(): void {
  const main = getMainSequenceListFromState(useProjectStore.getState());
  if (!main) return;
  sendRemoteCommand({ action: "set-active-cue-list", cueListId: main.id });
  const mainSelectedId = getPrimarySelectedCueId(main.selectedCueIds);
  if (mainSelectedId) {
    sendRemoteCommand({ action: "select-cue", cueId: mainSelectedId });
  }
}

/** Fire a hot cue, then return focus to the main list selection. */
export function triggerHotCueAndFocusMain(cue: Cue): void {
  if (isRemoteClient()) {
    sendRemoteCommand({ action: "hot-go", cueId: cue.id });
    restoreMainListFocusOnRemote();
    return;
  }
  triggerHotCue(cue);
  focusMainCueList();
}

/** GO the selected main-list cue (keyboard / transport), or the first top-level cue. */
export function triggerGoSelected(): void {
  const hotTarget = resolveHotGoTargetCue();
  if (hotTarget) {
    triggerHotCueAndFocusMain(hotTarget);
    return;
  }

  const targetId = resolveMainGoTargetCueId();
  if (!targetId) return;

  if (isRemoteClient()) {
    sendRemoteCommand({ action: "go", cueId: targetId });
    return;
  }

  const list = getMainSequenceListFromState(useProjectStore.getState());
  const target = list?.cues.find((c) => c.id === targetId);
  if (!target) return;

  triggerGoAndAdvance(target);
}
