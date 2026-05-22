import Box from "@mui/material/Box";
import type { ReactNode } from "react";
import { cueListDropActiveSx, cueListEmptySx } from "../../theme/cueStyles";
import type { GscTokenSet } from "../../theme/tokens";
import { CueListTrailingDrop } from "./CueListTrailingDrop";

interface CueListBodyProps {
  canEdit: boolean;
  listDropActive: boolean;
  tokens: GscTokenSet;
  isEmpty: boolean;
  onListDragOver: (e: React.DragEvent) => void;
  onListDragLeave: (e: React.DragEvent) => void;
  onListDrop: (e: React.DragEvent) => void;
  children: ReactNode;
}

export function CueListBody({
  canEdit,
  listDropActive,
  tokens,
  isEmpty,
  onListDragOver,
  onListDragLeave,
  onListDrop,
  children,
}: CueListBodyProps) {
  return (
    <Box
      component="ul"
      data-gsc-drop-zone="cue-list"
      onDragOver={onListDragOver}
      onDragOverCapture={onListDragOver}
      onDragLeave={onListDragLeave}
      onDrop={onListDrop}
      sx={{
        listStyle: "none",
        m: 0,
        p: 0,
        overflowY: "auto",
        flex: 1,
        minHeight: 120,
        display: "flex",
        flexDirection: "column",
        ...(listDropActive && cueListDropActiveSx(tokens)),
      }}
    >
      {isEmpty && (
        <Box component="li" sx={cueListEmptySx}>
          {canEdit
            ? "Drag assets here to create cues, or use + Cue below."
            : "No cues in this list."}
        </Box>
      )}
      {children}
      {!isEmpty && canEdit && <CueListTrailingDrop canEdit={canEdit} />}
    </Box>
  );
}
