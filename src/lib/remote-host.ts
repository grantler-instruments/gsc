import { remoteBroadcast } from "../platform/remote-server";
import {
  getActiveCueListFromState,
  getMainSequenceListFromState,
  useProjectStore,
} from "../stores/project";
import { patchActiveList } from "../stores/project/helpers";
import { useTransportStore } from "../stores/transport";
import type { Cue } from "../types/cue";
import type { RemoteHostCommand } from "../types/remote";
import { selectNextCueAfterGo } from "./cue-navigation";
import { getPrimarySelectedCueId } from "./cue-selection";
import { serializeRemoteSnapshot } from "./remote-snapshot";
import {
  resolveHotGoTargetCue,
  triggerHotCue,
  triggerHotCueAndFocusMain,
} from "./transport-actions";
import { triggerGo } from "./trigger";

function allHostCues(): Cue[] {
  return useProjectStore.getState().cueLists.flatMap((l) => l.cues);
}

/** Update cue selection on the booth host (not sent to remotes). */
export function setHostCueSelection(id: string | null): void {
  useProjectStore.setState((s) => ({
    ...patchActiveList(s, () => ({
      selectedCueIds: id ? [id] : [],
      selectionAnchorId: id,
    })),
  }));
}

function totalCueCount(): number {
  const { cueLists } = useProjectStore.getState();
  return cueLists.reduce((n, list) => n + list.cues.length, 0);
}

export async function broadcastRemoteSnapshot(): Promise<void> {
  try {
    if (totalCueCount() === 0) {
      return;
    }
    await remoteBroadcast(serializeRemoteSnapshot());
  } catch (err) {
    console.warn("[remote] broadcast failed", err);
  }
}

export function handleRemoteHostCommand(command: RemoteHostCommand): void {
  switch (command.action) {
    case "go-selected": {
      const hotTarget = resolveHotGoTargetCue();
      if (hotTarget) {
        triggerHotCueAndFocusMain(hotTarget);
        break;
      }
      const list = getMainSequenceListFromState(useProjectStore.getState());
      if (!list) break;
      const selectedCueId = getPrimarySelectedCueId(list.selectedCueIds);
      const targetId = selectedCueId ?? list.cues.find((c) => !c.parentId)?.id;
      const target = list.cues.find((c) => c.id === targetId);
      if (!target) break;
      triggerGoAndAdvanceHost(target.id);
      break;
    }
    case "go": {
      const list = getActiveCueListFromState(useProjectStore.getState());
      const target = list.cues.find((c) => c.id === command.cue_id);
      if (!target) break;
      triggerGoAndAdvanceHost(target.id);
      break;
    }
    case "hot-go": {
      const cue = allHostCues().find((c) => c.id === command.cue_id);
      if (!cue) break;
      triggerHotCueAndFocusMain(cue);
      break;
    }
    case "select-cue":
      setHostCueSelection(command.cue_id);
      break;
    case "panic":
      useTransportStore.getState().panic();
      break;
    case "set-master-volume":
      useTransportStore.getState().setMasterVolume(command.value);
      break;
    case "set-active-cue-list":
      useProjectStore.getState().setActiveCueList(command.cue_list_id);
      break;
    default:
      break;
  }
  void broadcastRemoteSnapshot();
}

function triggerGoAndAdvanceHost(cueId: string): void {
  const list = getActiveCueListFromState(useProjectStore.getState());
  const cue = list.cues.find((c) => c.id === cueId);
  if (!cue) return;
  // Hot lists fire as overlays without advancing selection (matches local GO).
  if (list.kind === "hot") {
    triggerHotCue(cue);
    return;
  }
  const transport = useTransportStore.getState();
  triggerGo(cue, list.cues, {
    go: transport.go,
    goMany: transport.goMany,
    stopMany: transport.stopMany,
  });
  selectNextCueAfterGo(cue.id);
}
