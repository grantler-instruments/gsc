import { useCallback, useState } from "react";
import { isUtilityCue } from "../../lib/cues";
import type { Cue } from "../../types/cue";
import { useProjectStore } from "../../stores/project";

export function useCueListRename(cues: Cue[]) {
  const updateCue = useProjectStore((s) => s.updateCue);
  const [renamingCueId, setRenamingCueId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const startRename = useCallback(
    (cueId: string) => {
      const cue = cues.find((c) => c.id === cueId);
      if (!cue || isUtilityCue(cue)) return;
      setRenamingCueId(cueId);
      setRenameValue(cue.name);
    },
    [cues],
  );

  const commitRename = useCallback(
    (cueId: string) => {
      const trimmed = renameValue.trim();
      if (trimmed) {
        updateCue(cueId, { name: trimmed });
      }
      setRenamingCueId(null);
    },
    [renameValue, updateCue],
  );

  const cancelRename = useCallback(() => {
    setRenamingCueId(null);
  }, []);

  return {
    renamingCueId,
    renameValue,
    setRenameValue,
    startRename,
    commitRename,
    cancelRename,
  };
}
