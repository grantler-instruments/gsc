import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import { memo } from "react";
import { canOpacityFadeTarget, canVolumeFadeTarget } from "../../lib/fade";
import { formatDmxCue } from "../../lib/dmx";
import { formatMidiCue } from "../../lib/midi";
import { formatOscCue } from "../../lib/osc";
import { formatPlaybackRangeLabel } from "../../lib/time";
import { cueShowsPlaybackProgress } from "../../lib/playback-slice";
import {
  resolveEffectiveOpacity,
  resolveEffectiveVolume,
  useFadeStore,
} from "../../stores/fade";
import { usePlaybackStore } from "../../stores/playback";
import { useProjectStore } from "../../stores/project";
import { useGscTokens } from "../../theme/useGscTokens";
import type { Cue } from "../../types/cue";
import { AudioWaveform } from "../AudioWaveform";
import { PlaybackProgress } from "../PlaybackProgress";
import { CueTypeBadge } from "../CueTypeIcon";
import { ActiveCueLevelControl } from "./ActiveCueLevelControl";

interface ActiveCueRowProps {
  cue: Cue;
  isPrimary: boolean;
  selected: boolean;
  onSelect: () => void;
  onStop: () => void;
}

export const ActiveCueRow = memo(function ActiveCueRow({
  cue,
  isPrimary,
  selected,
  onSelect,
  onStop,
}: ActiveCueRowProps) {
  const tokens = useGscTokens();
  const updateCue = useProjectStore((s) => s.updateCue);
  const clearFade = useFadeStore((s) => s.clearFade);
  const playback = usePlaybackStore((s) => s.byCueId[cue.id]);
  const volumeFade = useFadeStore(
    (s) =>
      s.fadesByTargetId[cue.id]?.property === "volume"
        ? s.fadesByTargetId[cue.id]
        : undefined,
  );
  const opacityFade = useFadeStore(
    (s) =>
      s.fadesByTargetId[cue.id]?.property === "opacity"
        ? s.fadesByTargetId[cue.id]
        : undefined,
  );
  const fadeFrameMs = useFadeStore((s) =>
    volumeFade || opacityFade ? s.frameMs : 0,
  );

  const fixtures = useProjectStore((s) => s.fixtures);
  const rangeLabel =
    cue.type !== "midi" && cue.type !== "osc" && cue.type !== "dmx"
      ? formatPlaybackRangeLabel(cue.inTime, cue.outTime, cue.type === "image")
      : null;

  return (
    <Box
      component="li"
      onClick={onSelect}
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
        {cue.type === "dmx" && cue.dmx && (
          <Typography
            component="span"
            noWrap
            sx={{ fontSize: 11, color: "text.secondary" }}
          >
            {formatDmxCue(cue.dmx, fixtures)}
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
        {canVolumeFadeTarget(cue) && (
          <ActiveCueLevelControl
            label="Vol"
            value={resolveEffectiveVolume(
              cue.id,
              cue.volume ?? 1,
              fadeFrameMs || undefined,
            )}
            onChange={(volume) => {
              if (volumeFade) clearFade(cue.id);
              updateCue(cue.id, { volume });
            }}
          />
        )}
        {canOpacityFadeTarget(cue) && (
          <ActiveCueLevelControl
            label="Opac"
            value={resolveEffectiveOpacity(
              cue.id,
              cue.opacity ?? 1,
              fadeFrameMs || undefined,
            )}
            onChange={(opacity) => {
              if (opacityFade) clearFade(cue.id);
              updateCue(cue.id, { opacity });
            }}
          />
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
          onStop();
        }}
      >
        Stop
      </Button>
    </Box>
  );
});
