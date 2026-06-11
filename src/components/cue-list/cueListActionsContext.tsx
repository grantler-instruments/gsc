import { createContext, type ReactNode, useContext, useMemo } from "react";
import { applyAssetPayloads } from "../../lib/asset-drop";
import type { AssetDragPayload } from "../../lib/drag";
import { triggerGoAndAdvance, triggerHotCue } from "../../lib/transport-actions";
import { useProjectStore } from "../../stores/project";
import type { RunningSequence } from "../../stores/transport";
import { useUiStore } from "../../stores/ui";
import type { Cue } from "../../types/cue";

export interface CueListActionsContextValue {
  canEdit: boolean;
  listId: string;
  allCues: Cue[];
  runningSequences: Record<string, RunningSequence>;
  onGo: (cue: Cue) => void;
  onRemove: (cueId: string) => void;
  onCreateStop: (cueId: string) => void;
  onCreateVolumeFade: (cueId: string) => void;
  onCreateOpacityFade: (cueId: string) => void;
  onCreatePanFade: (cueId: string) => void;
  onCreateLightFade: (cueId: string) => void;
  onAssetDrop: (cueId: string, payload: AssetDragPayload) => void;
  onCueDrop: (draggedId: string, groupId: string) => void;
  onCueReorder: (draggedId: string, targetId: string, place: "before" | "after") => void;
  onToggleExpand: (groupId: string) => void;
}

const CueListActionsContext = createContext<CueListActionsContextValue | null>(null);

export function useCueListActions(): CueListActionsContextValue {
  const ctx = useContext(CueListActionsContext);
  if (!ctx) {
    throw new Error("useCueListActions must be used within CueListActionsProvider");
  }
  return ctx;
}

interface CueListActionsProviderProps {
  canEdit: boolean;
  listId: string;
  allCues: Cue[];
  runningSequences: Record<string, RunningSequence>;
  /** When true, GO fires cues as overlays (hot cues) without advancing the list. */
  hot?: boolean;
  children: ReactNode;
}

export function CueListActionsProvider({
  canEdit,
  listId,
  allCues,
  runningSequences,
  hot = false,
  children,
}: CueListActionsProviderProps) {
  const removeCue = useProjectStore((s) => s.removeCue);
  const addStopCueForTarget = useProjectStore((s) => s.addStopCueForTarget);
  const addFadeCueForTarget = useProjectStore((s) => s.addFadeCueForTarget);
  const moveCueToGroup = useProjectStore((s) => s.moveCueToGroup);
  const reorderCueRelative = useProjectStore((s) => s.reorderCueRelative);
  const toggleCueGroupCollapsed = useUiStore((s) => s.toggleCueGroupCollapsed);

  const value = useMemo<CueListActionsContextValue>(
    () => ({
      canEdit,
      listId,
      allCues,
      runningSequences,
      onGo: (cue) => (hot ? triggerHotCue(cue) : triggerGoAndAdvance(cue)),
      onRemove: removeCue,
      onCreateStop: addStopCueForTarget,
      onCreateVolumeFade: (cueId) => addFadeCueForTarget(cueId, "volumeFade"),
      onCreateOpacityFade: (cueId) => addFadeCueForTarget(cueId, "opacityFade"),
      onCreatePanFade: (cueId) => addFadeCueForTarget(cueId, "panFade"),
      onCreateLightFade: (cueId) => addFadeCueForTarget(cueId, "lightFade"),
      onAssetDrop: (cueId, payload) => {
        applyAssetPayloads([payload], { kind: "row", listId, cueId });
      },
      onCueDrop: (draggedId, groupId) => moveCueToGroup(draggedId, groupId),
      onCueReorder: reorderCueRelative,
      onToggleExpand: toggleCueGroupCollapsed,
    }),
    [
      canEdit,
      listId,
      allCues,
      runningSequences,
      hot,
      removeCue,
      addStopCueForTarget,
      addFadeCueForTarget,
      moveCueToGroup,
      reorderCueRelative,
      toggleCueGroupCollapsed,
    ],
  );

  return <CueListActionsContext.Provider value={value}>{children}</CueListActionsContext.Provider>;
}
