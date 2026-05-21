import { selectNextCueAfterGo } from "./cue-navigation";
import { getPrimarySelectedCueId } from "./cue-selection";
import { triggerGo } from "./trigger";
import type { Cue } from "../types/cue";
import { useProjectStore } from "../stores/project";
import { useTransportStore } from "../stores/transport";

function getActiveListFromStore() {
  const state = useProjectStore.getState();
  return (
    state.cueLists.find((l) => l.id === state.activeCueListId) ??
    state.cueLists[0]
  );
}

export function triggerGoAndAdvance(cue: Cue): void {
  const list = getActiveListFromStore();
  const transport = useTransportStore.getState();
  triggerGo(cue, list.cues, {
    go: transport.go,
    goMany: transport.goMany,
    stopMany: transport.stopMany,
  });
  selectNextCueAfterGo(cue.id);
}

/** GO the selected cue, or the first top-level cue if none selected. */
export function triggerGoSelected(): void {
  const list = getActiveListFromStore();
  const selectedCueId = getPrimarySelectedCueId(list.selectedCueIds);
  const targetId =
    selectedCueId ?? list.cues.find((c) => !c.parentId)?.id;
  const target = list.cues.find((c) => c.id === targetId);
  if (!target) return;

  triggerGoAndAdvance(target);
}
