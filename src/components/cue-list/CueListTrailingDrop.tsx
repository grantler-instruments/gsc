import Box from "@mui/material/Box";
import { useGscTokens } from "../../theme/useGscTokens";
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
      sx={{
        flex: 1,
        minHeight: 40,
        listStyle: "none",
        ...(dropActive && {
          boxShadow: `inset 0 2px 0 ${tokens.accent}`,
          bgcolor: "rgba(201, 162, 39, 0.06)",
        }),
      }}
    />
  );
}
