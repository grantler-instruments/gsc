import { isRemoteClient } from "../platform/remote-mode";
import { getActiveCueListFromState, useProjectStore } from "../stores/project";
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
  const list = getActiveCueListFromState(useProjectStore.getState());
  const transport = useTransportStore.getState();
  triggerGo(cue, list.cues, {
    go: transport.go,
    goMany: transport.goMany,
    stopMany: transport.stopMany,
  });
  selectNextCueAfterGo(cue.id);
}

function resolveGoTargetCueId(): string | null {
  const list = getActiveCueListFromState(useProjectStore.getState());
  const selectedCueId = getPrimarySelectedCueId(list.selectedCueIds);
  return selectedCueId ?? list.cues.find((c) => !c.parentId)?.id ?? null;
}

/** GO the selected cue, or the first top-level cue if none selected. */
export function triggerGoSelected(): void {
  const targetId = resolveGoTargetCueId();
  if (!targetId) return;

  if (isRemoteClient()) {
    sendRemoteCommand({ action: "go", cueId: targetId });
    return;
  }

  const list = getActiveCueListFromState(useProjectStore.getState());
  const target = list.cues.find((c) => c.id === targetId);
  if (!target) return;

  triggerGoAndAdvance(target);
}
