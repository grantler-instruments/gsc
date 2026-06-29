import Box from "@mui/material/Box";
import { useGscTokens } from "../../theme/useGscTokens";
import { cueListTrailingDropZoneSx } from "./cueDropZoneSx";
import { useCueListActions } from "./cueListActionsContext";
import { useCueListTrailingDrop } from "./useCueListTrailingDrop";

interface CueListTrailingDropProps {
  canEdit: boolean;
}

export function CueListTrailingDrop({ canEdit }: CueListTrailingDropProps) {
  const tokens = useGscTokens();
  const { allCues } = useCueListActions();
  const { dropActive, onDragOver, onDragLeave, onDrop } = useCueListTrailingDrop(canEdit, allCues);

  return (
    <Box
      component="li"
      aria-hidden
      data-gsc-drop-zone="cue-list-trailing"
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      sx={cueListTrailingDropZoneSx(tokens, dropActive)}
    />
  );
}
