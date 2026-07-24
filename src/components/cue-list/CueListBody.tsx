import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import Typography from "@mui/material/Typography";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { GSC_LIST_ID } from "../../lib/tauri-drop";
import { useUiStore } from "../../stores/ui";
import { cueListDropActiveSx, cueListEmptySx } from "../../theme/cueStyles";
import type { GscTokenSet } from "../../theme/tokens";
import { CueListTrailingDrop } from "./CueListTrailingDrop";

interface CueListBodyProps {
  listId: string;
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
  listId,
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
  const assetImportCount = useUiStore((s) => s.assetImportCount);

  return (
    <Box
      component="ul"
      data-gsc-drop-zone="cue-list"
      {...{ [GSC_LIST_ID]: listId }}
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
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
        position: "relative",
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
      {assetImportCount > 0 && (
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            zIndex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 1,
            bgcolor: "background.paper",
            opacity: 0.9,
          }}
        >
          <CircularProgress size={20} />
          <Typography component="span" sx={{ fontSize: 14 }}>
            {t("common.action.importing")}
          </Typography>
        </Box>
      )}
    </Box>
  );
}
