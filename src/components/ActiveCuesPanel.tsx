import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { isContainerCue, isStopCue } from "../lib/cues";
import { formatMidiCue } from "../lib/midi";
import { triggerStopCue } from "../lib/trigger";
import { formatPlaybackRangeLabel } from "../lib/time";
import { getPrimarySelectedCueId } from "../lib/cue-selection";
import { findCueInLists } from "../lib/cue-lists";
import { findProjectCue, useProjectStore } from "../stores/project";
import { useTransportStore } from "../stores/transport";
import { AudioWaveform } from "./AudioWaveform";
import { PlaybackProgress } from "./PlaybackProgress";
import { CueTypeBadge } from "./CueTypeIcon";
import { cueShowsPlaybackProgress } from "../lib/playback-slice";
import { usePlaybackStore } from "../stores/playback";
import { VisualMonitor } from "./VisualMonitor";

export function ActiveCuesPanel() {
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
        c !== undefined && !isContainerCue(c) && !isStopCue(c),
    );

  return (
    <Box
      className="sidebar-panel-content"
      sx={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
        overflow: "hidden",
      }}
    >
      <VisualMonitor className="visual-monitor-sidebar" />

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

      <Box component="ul" className="active-cue-list">
        {activeCues.length === 0 && (
          <Box component="li" className="asset-list-empty">
            No active cues. Press GO to run the selected cue.
          </Box>
        )}
        {activeCues.map((cue) => {
          const isPrimary = cue.id === activeCueId;
          const playback = progressByCueId[cue.id];
          const rangeLabel =
            cue.type !== "midi"
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
              className={[
                "active-cue-item",
                cue.id === selectedCueId && "active-cue-item-selected",
                isPrimary && "active-cue-item-primary",
              ]
                .filter(Boolean)
                .join(" ")}
              onClick={() => selectCue(cue.id)}
            >
              <CueTypeBadge
                type={cue.type}
                showLabel={false}
                className="cue-row-type"
              />
              <Box className="active-cue-item-main">
                <Typography
                  component="span"
                  className="active-cue-number"
                  sx={{ fontVariantNumeric: "tabular-nums" }}
                >
                  {cue.number}
                </Typography>
                <Typography component="span" className="active-cue-name" noWrap>
                  {cue.name}
                </Typography>
                {cue.type === "midi" && cue.midi && (
                  <Typography component="span" className="cue-detail" noWrap>
                    {formatMidiCue(cue.midi)}
                  </Typography>
                )}
                {cue.type === "audio" && cue.assetPath && (
                  <AudioWaveform
                    assetPath={cue.assetPath}
                    inTime={cue.inTime}
                    outTime={cue.outTime}
                    positionSec={playback?.positionSec}
                    height={36}
                    className="audio-waveform-active"
                  />
                )}
                {rangeLabel && (
                  <Typography component="span" className="cue-detail" noWrap>
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
                  className="active-cue-badge"
                  title="Last triggered"
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
