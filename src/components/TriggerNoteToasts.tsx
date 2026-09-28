import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { getPrimarySelectedCueId } from "../lib/cue-selection";
import { useActiveCueList } from "../stores/project";

/** Movable preview of the selected cue's trigger note for the operator. */
export function TriggerNoteToasts() {
  const { t } = useTranslation();
  const activeList = useActiveCueList();
  const selectedCueId = getPrimarySelectedCueId(activeList.selectedCueIds);
  const cue = selectedCueId ? activeList.cues.find((c) => c.id === selectedCueId) : undefined;
  const message = cue?.triggerNote?.trim();
  const [dismissedCueId, setDismissedCueId] = useState<string | null>(null);

  useEffect(() => {
    setDismissedCueId((previous) => (previous === selectedCueId ? previous : null));
  }, [selectedCueId]);

  if (!cue || !message || dismissedCueId === selectedCueId) return null;

  return (
    <Box
      aria-live="polite"
      sx={{
        flexShrink: 0,
        px: { xs: 1, sm: 2 },
        py: 0.75,
        bgcolor: "background.paper",
      }}
    >
      <Alert
        severity="info"
        variant="outlined"
        sx={{
          width: "100%",
          "& .MuiAlert-message": { minWidth: 0, flex: 1 },
          overflowWrap: "anywhere",
        }}
        onClose={() => selectedCueId && setDismissedCueId(selectedCueId)}
        slotProps={{
          closeButton: {
            "aria-label": t("common.action.close"),
          },
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 0.5 }}>
          <Typography component="span" variant="caption" sx={{ opacity: 0.85, fontWeight: 600 }}>
            {cue.name}
          </Typography>
        </Box>
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
