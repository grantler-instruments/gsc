import Box from "@mui/material/Box";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
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
  onListDropCapture: () => void;
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
  onListDropCapture,
  children,
}: CueListBodyProps) {
  const { t } = useTranslation();

  return (
    <Box
      component="ul"
      data-gsc-drop-zone="cue-list"
      onDragOver={onListDragOver}
      onDragOverCapture={onListDragOver}
      onDragLeave={onListDragLeave}
      onDrop={onListDrop}
      onDropCapture={onListDropCapture}
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
          {canEdit ? t("cueList.emptyHint") : t("cueList.noCues")}
        </Box>
      )}
      {children}
      {!isEmpty && canEdit && <CueListTrailingDrop canEdit={canEdit} />}
    </Box>
  );
}
