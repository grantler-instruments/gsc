import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { getPrimarySelectedCueId } from "../lib/cue-selection";
import { getCueDisplayName } from "../lib/cues";
import { useActiveCueList } from "../stores/project";

/** Top-right preview of the selected cue's trigger note for the operator. */
export function TriggerNoteToasts() {
  const { t } = useTranslation();
  const activeList = useActiveCueList();
  const selectedCueId = getPrimarySelectedCueId(activeList.selectedCueIds);
  const cue = selectedCueId ? activeList.cues.find((c) => c.id === selectedCueId) : undefined;
  const message = cue?.triggerNote?.trim();
  const [dismissedCueId, setDismissedCueId] = useState<string | null>(null);

  useEffect(() => {
    setDismissedCueId(null);
  }, [selectedCueId]);

  if (!cue || !message || dismissedCueId === selectedCueId) return null;

  const cueName = getCueDisplayName(cue, activeList.cues);

  return (
    <Box
      aria-live="polite"
      sx={{
        position: "fixed",
        top: 16,
        right: 16,
        zIndex: (theme) => theme.zIndex.snackbar + 1,
        maxWidth: 360,
        width: "min(360px, calc(100vw - 32px))",
      }}
    >
      <Alert
        severity="info"
        variant="filled"
        sx={{ width: "100%" }}
        onClose={() => selectedCueId && setDismissedCueId(selectedCueId)}
        slotProps={{
          closeButton: {
            "aria-label": t("common.action.close"),
          },
        }}
      >
        <Typography
          component="p"
          variant="caption"
          sx={{
            m: 0,
            mb: 0.5,
            opacity: 0.85,
            fontWeight: 600,
            letterSpacing: "0.02em",
            lineHeight: 1.3,
          }}
        >
          {cueName}
        </Typography>
        <Typography
          component="p"
          variant="body1"
          sx={{
            m: 0,
            fontWeight: 500,
            lineHeight: 1.45,
            whiteSpace: "pre-wrap",
          }}
        >
          {message}
        </Typography>
      </Alert>
    </Box>
  );
}
