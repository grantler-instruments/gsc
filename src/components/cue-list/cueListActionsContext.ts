import { createContext, useContext } from "react";
import type { AssetDragPayload } from "../../lib/drag";
import type { RunningSequence } from "../../stores/transport";
import type { Cue } from "../../types/cue";

// Keep context identity independent of the provider's Fast Refresh boundary.
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
  onCueReparent: (draggedId: string, targetId: string, place: "before" | "after") => void;
  onCueReparentToListEnd: (draggedId: string) => void;
  onCueReorder: (draggedId: string, targetId: string, place: "before" | "after") => void;
  onToggleExpand: (groupId: string) => void;
}

export const CueListActionsContext = createContext<CueListActionsContextValue | null>(null);

export function useCueListActions(): CueListActionsContextValue {
  const ctx = useContext(CueListActionsContext);
  if (!ctx) {
    throw new Error("useCueListActions must be used within CueListActionsProvider");
  }
  return ctx;
}
