import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Slider from "@mui/material/Slider";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { findProjectCue, useActiveCueList, useProjectStore } from "../stores/project";
import { useTransportStore } from "../stores/transport";
import { getPrimarySelectedCueId } from "../lib/cue-selection";
import { getCueDisplayName } from "../lib/cues";
import { triggerGoSelected } from "../lib/transport-actions";
import { SIDEBAR_WIDTH } from "../types/sidebar";
import { CueTypeBadge } from "./CueTypeIcon";

export function TransportBar() {
  const cueLists = useProjectStore((s) => s.cueLists);
  const activeList = useActiveCueList();
  const selectedCueIds = activeList.selectedCueIds;
  const selectedCueId = getPrimarySelectedCueId(selectedCueIds);
  const cues = activeList.cues;
  const isPlaying = useTransportStore((s) => s.isPlaying);
  const activeCueId = useTransportStore((s) => s.activeCueId);
  const masterVolume = useTransportStore((s) => s.masterVolume);
  const panic = useTransportStore((s) => s.panic);
  const setMasterVolume = useTransportStore((s) => s.setMasterVolume);
  const selectedCue = cues.find((c) => c.id === selectedCueId);
  const activeCue = activeCueId
    ? findProjectCue(cueLists, activeCueId)
    : undefined;
  const activeCount = useTransportStore((s) => s.activeCueIds.length);
  const playingOther =
    isPlaying && activeCue && activeCue.id !== selectedCueId;

  return (
    <Box
      component="footer"
      sx={{
        display: "flex",
        alignItems: "stretch",
        borderTop: 1,
        borderColor: "divider",
        bgcolor: "background.paper",
        flexShrink: 0,
      }}
    >
      <Stack
        direction="row"
        sx={{
          width: SIDEBAR_WIDTH,
          flexShrink: 0,
          px: 1.5,
          py: 1.25,
          gap: 1,
          alignItems: "center",
          borderRight: 1,
          borderColor: "divider",
          "& .MuiButton-root": { flex: 1, minWidth: 0 },
        }}
      >
        <Button
          variant="contained"
          color="success"
          onClick={triggerGoSelected}
          disabled={cues.length === 0}
        >
          GO
        </Button>
        <Button variant="outlined" color="error" onClick={panic}>
          Panic
        </Button>
      </Stack>

      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 2,
          flex: 1,
          minWidth: 0,
          px: 2,
          py: 1.25,
        }}
      >
        {selectedCue ? (
          <Stack sx={{ flex: 1, minWidth: 0, gap: 0.5 }}>
            <Stack
              direction="row"
              sx={{ alignItems: "center", gap: 1, minWidth: 0 }}
            >
              <Typography
                variant="overline"
                color="text.secondary"
                sx={{ flexShrink: 0 }}
              >
                Selected
              </Typography>
              <CueTypeBadge type={selectedCue.type} showLabel={false} />
              <Typography
                component="strong"
                sx={{
                  color: "primary.main",
                  fontVariantNumeric: "tabular-nums",
                  flexShrink: 0,
                }}
              >
                {selectedCue.number}
              </Typography>
              <Typography noWrap sx={{ minWidth: 0 }}>
                {getCueDisplayName(selectedCue, cues)}
              </Typography>
            </Stack>
            {selectedCue.notes?.trim() && (
              <Typography
                variant="caption"
                sx={{
                  m: 0,
                  p: 1,
                  color: "text.secondary",
                  bgcolor: "background.default",
                  border: 1,
                  borderColor: "divider",
                  borderRadius: 1,
                  whiteSpace: "pre-wrap",
                  maxHeight: "4.5em",
                  overflowY: "auto",
                  lineHeight: 1.45,
                }}
              >
                {selectedCue.notes.trim()}
              </Typography>
            )}
          </Stack>
        ) : (
          <Typography variant="caption" color="text.secondary">
            No cue selected
          </Typography>
        )}
        {playingOther && activeCue && (
          <Stack
            direction="row"
            sx={{ alignItems: "center", gap: 1, minWidth: 0 }}
          >
            <Typography
              variant="overline"
              color="text.secondary"
              sx={{ flexShrink: 0 }}
            >
              Playing
            </Typography>
            <CueTypeBadge type={activeCue.type} showLabel={false} />
            <Typography
              component="strong"
              sx={{ color: "primary.main", fontVariantNumeric: "tabular-nums" }}
            >
              {activeCue.number}
            </Typography>
            <Typography noWrap>{activeCue.name}</Typography>
          </Stack>
        )}
        {isPlaying && activeCount > 0 && !playingOther && (
          <Chip
            label={activeCount === 1 ? "Playing" : `${activeCount} active`}
            size="small"
            sx={{
              bgcolor: "var(--playing-badge-bg)",
              color: "success.main",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              height: "auto",
              "& .MuiChip-label": { fontSize: 10, px: 1, py: 0.25 },
            }}
          />
        )}
      </Box>

      <Stack
        direction="row"
        sx={{
          alignItems: "center",
          gap: 1,
          fontSize: 12,
          color: "text.secondary",
          flexShrink: 0,
          px: 2,
          py: 1.25,
        }}
      >
        <Typography variant="caption" color="inherit">
          Master
        </Typography>
        <Slider
          size="small"
          min={0}
          max={1}
          step={0.01}
          value={masterVolume}
          onChange={(_, value) => setMasterVolume(value as number)}
          sx={{ width: 100, color: "primary.main" }}
        />
      </Stack>
    </Box>
  );
}
