import { isRemoteClient } from "../platform/remote-mode";
import {
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

/** GO the selected main-list cue (keyboard / transport), or the first top-level cue. */
export function triggerGoSelected(): void {
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
