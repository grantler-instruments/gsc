import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { isContainerCue, isStopCue, isWaitCue } from "../lib/cues";
import { formatMidiCue } from "../lib/midi";
import { formatOscCue } from "../lib/osc";
import { triggerStopCue } from "../lib/trigger";
import { formatPlaybackRangeLabel } from "../lib/time";
import { getPrimarySelectedCueId } from "../lib/cue-selection";
import { findCueInLists } from "../lib/cue-lists";
import { findProjectCue, useProjectStore } from "../stores/project";
import { useTransportStore } from "../stores/transport";
import { useGscTokens } from "../theme/useGscTokens";
import { AudioWaveform } from "./AudioWaveform";
import { PlaybackProgress } from "./PlaybackProgress";
import { CueTypeBadge } from "./CueTypeIcon";
import { cueShowsPlaybackProgress } from "../lib/playback-slice";
import { usePlaybackStore } from "../stores/playback";
import { VisualMonitor } from "./VisualMonitor";

const emptyListSx = {
  p: "16px 12px",
  color: "text.secondary",
  fontSize: 13,
} as const;

export function ActiveCuesPanel() {
  const tokens = useGscTokens();
  const cueLists = useProjectStore((s) => s.cueLists);
  const activeList = useProjectStore((s) =>
    s.cueLists.find((l) => l.id === s.activeCueListId) ?? s.cueLists[0],
  );
  const selectedCueId = getPrimarySelectedCueId(activeList.selectedCueIds);
  const selectCue = useProjectStore((s) => s.selectCue);
  const activeCueIds = useTransportStore((s) => s.activeCueIds);
  const activeCueId = useTransportStore((s) => s.activeCueId);
  const stopMany = useTransportStore((s) => s.stopMany);
  const stop = useTransportStore((s) => s.stop);
  const progressByCueId = usePlaybackStore((s) => s.byCueId);

  const activeCues = activeCueIds
    .map((id) => findProjectCue(cueLists, id))
    .filter(
      (c): c is NonNullable<typeof c> =>
        c !== undefined &&
        !isContainerCue(c) &&
        !isStopCue(c) &&
        !isWaitCue(c),
    );

  return (
    <Box
      sx={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
        overflow: "hidden",
      }}
    >
      <VisualMonitor variant="sidebar" />

      {activeCues.length > 0 && (
        <Stack
          direction="row"
          sx={{
            justifyContent: "flex-end",
            px: 1,
            py: 0.75,
            borderBottom: 1,
            borderColor: "divider",
            flexShrink: 0,
          }}
        >
          <Button variant="text" size="small" onClick={stop}>
            Stop all
          </Button>
        </Stack>
      )}

      <Box
        component="ul"
        sx={{
          listStyle: "none",
          m: 0,
          p: 0,
          overflowY: "auto",
          flex: 1,
        }}
      >
        {activeCues.length === 0 && (
          <Box component="li" sx={emptyListSx}>
            No active cues. Press GO to run the selected cue.
          </Box>
        )}
        {activeCues.map((cue) => {
          const isPrimary = cue.id === activeCueId;
          const selected = cue.id === selectedCueId;
          const playback = progressByCueId[cue.id];
          const rangeLabel =
            cue.type !== "midi" && cue.type !== "osc"
              ? formatPlaybackRangeLabel(
                  cue.inTime,
                  cue.outTime,
                  cue.type === "image",
                )
              : null;

          return (
            <Box
              component="li"
              key={cue.id}
              onClick={() => selectCue(cue.id)}
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                px: 1.5,
                py: 1,
                borderBottom: 1,
                borderColor: "divider",
                cursor: "pointer",
                "&:hover": { bgcolor: tokens.bgHover },
                ...(selected && {
                  bgcolor: tokens.rowSelected,
                  boxShadow: `inset 4px 0 0 ${tokens.accent}`,
                }),
                ...(isPrimary && { bgcolor: tokens.rowActive }),
              }}
            >
              <CueTypeBadge type={cue.type} showLabel={false} compact />
              <Box
                sx={{
                  flex: 1,
                  minWidth: 0,
                  display: "flex",
                  flexDirection: "column",
                  gap: 0.25,
                }}
              >
                <Typography
                  component="span"
                  sx={{
                    fontWeight: 600,
                    fontSize: 12,
                    color: tokens.accent,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {cue.number}
                </Typography>
                <Typography component="span" noWrap sx={{ fontSize: 13 }}>
                  {cue.name}
                </Typography>
                {cue.type === "midi" && cue.midi && (
                  <Typography
                    component="span"
                    noWrap
                    sx={{ fontSize: 11, color: "text.secondary" }}
                  >
                    {formatMidiCue(cue.midi)}
                  </Typography>
                )}
                {cue.type === "osc" && cue.osc && (
                  <Typography
                    component="span"
                    noWrap
                    sx={{ fontSize: 11, color: "text.secondary" }}
                  >
                    {formatOscCue(cue.osc)}
                  </Typography>
                )}
                {cue.type === "audio" && cue.assetPath && (
                  <Box sx={{ mt: 0.5 }}>
                    <AudioWaveform
                      assetPath={cue.assetPath}
                      inTime={cue.inTime}
                      outTime={cue.outTime}
                      positionSec={playback?.positionSec}
                      height={36}
                    />
                  </Box>
                )}
                {rangeLabel && (
                  <Typography
                    component="span"
                    noWrap
                    sx={{ fontSize: 11, color: "text.secondary" }}
                  >
                    {rangeLabel}
                  </Typography>
                )}
                {playback && cueShowsPlaybackProgress(cue) && (
                  <PlaybackProgress progress={playback} />
                )}
              </Box>
              {isPrimary && (
                <Box
                  component="span"
                  title="Last triggered"
                  sx={{
                    color: "success.main",
                    fontSize: 10,
                    flexShrink: 0,
                  }}
                >
                  ●
                </Box>
              )}
              <Button
                variant="text"
                size="small"
                title="Stop this cue"
                onClick={(e) => {
                  e.stopPropagation();
                  triggerStopCue(
                    cue,
                    findCueInLists(cueLists, cue.id)?.list.cues ?? [],
                    stopMany,
                  );
                }}
              >
                Stop
              </Button>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}
