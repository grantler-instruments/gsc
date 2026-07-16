import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import { memo, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useDmxFadeCueProgress } from "../../hooks/useDmxFadeCueProgress";
import { formatDmxCue } from "../../lib/dmx";
import {
  canOpacityFadeTarget,
  canPanFadeTarget,
  canVolumeFadeTarget,
  isLightFadeCue,
  resolveLightFadeEndDmx,
} from "../../lib/fade";
import { formatMidiCue } from "../../lib/midi";
import { formatOscCue } from "../../lib/osc";
import { cueShowsPlaybackProgress } from "../../lib/playback-slice";
import { formatPlaybackRangeLabel } from "../../lib/time";
import {
  resolveEffectiveOpacity,
  resolveEffectivePan,
  resolveEffectiveVolume,
  useFadeStore,
} from "../../stores/fade";
import { usePlaybackStore } from "../../stores/playback";
import { useProjectStore } from "../../stores/project";
import { useTransportStore } from "../../stores/transport";
import { useGscTokens } from "../../theme/useGscTokens";
import type { Cue } from "../../types/cue";
import { AudioWaveform } from "../AudioWaveform";
import { CueTypeBadge } from "../CueTypeIcon";
import { PlaybackProgress } from "../PlaybackProgress";
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
  const { t } = useTranslation();
  const tokens = useGscTokens();
  const cueLists = useProjectStore((s) => s.cueLists);
  const updateCue = useProjectStore((s) => s.updateCue);
  const clearFade = useFadeStore((s) => s.clearFade);
  const playback = usePlaybackStore((s) => s.byCueId[cue.id]);
  const seekCue = useTransportStore((s) => s.seekCue);
  const fadeProperty = useFadeStore((s) => s.fadesByTargetId[cue.id]?.property);
  const fadeFrameMs = useFadeStore((s) => (cue.id in s.fadesByTargetId ? s.frameMs : 0));
  const lightFadeProgress = useDmxFadeCueProgress(cue.id);

  const fixtures = useProjectStore((s) => s.fixtures);
  const allCues = useMemo(() => cueLists.flatMap((list) => list.cues), [cueLists]);
  const lightFadeEndDmx =
    isLightFadeCue(cue) && cue.dmx ? resolveLightFadeEndDmx(cue, allCues, fixtures) : null;
  const rangeLabel =
    cue.type !== "midi" && cue.type !== "osc" && cue.type !== "dmx"
      ? formatPlaybackRangeLabel(cue.inTime, cue.outTime, cue.type === "image")
      : null;

  return (
    <Box
      component="li"
      data-cue-name={cue.name}
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
          bgcolor: `color-mix(in srgb, ${tokens.accent} 22%, ${tokens.bgElevated})`,
          boxShadow: `inset 4px 0 0 ${tokens.accent}, inset 0 0 0 1px color-mix(in srgb, ${tokens.accent} 45%, transparent)`,
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
          <Typography component="span" noWrap sx={{ fontSize: 11, color: "text.secondary" }}>
            {formatMidiCue(cue.midi)}
          </Typography>
        )}
        {cue.type === "osc" && cue.osc && (
          <Typography component="span" noWrap sx={{ fontSize: 11, color: "text.secondary" }}>
            {formatOscCue(cue.osc)}
          </Typography>
        )}
        {cue.type === "dmx" && cue.dmx && (
          <Typography component="span" noWrap sx={{ fontSize: 11, color: "text.secondary" }}>
            {formatDmxCue(cue.dmx, fixtures)}
          </Typography>
        )}
        {isLightFadeCue(cue) && lightFadeEndDmx && (
          <Typography component="span" noWrap sx={{ fontSize: 11, color: "text.secondary" }}>
            {formatDmxCue(lightFadeEndDmx, fixtures)}
          </Typography>
        )}
        {(cue.type === "audio" || cue.type === "tts" || cue.type === "video") && cue.assetPath && (
          <Box
            sx={{ mt: 0.5 }}
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <AudioWaveform
              assetPath={cue.assetPath}
              inTime={cue.inTime}
              outTime={cue.outTime}
              positionSec={playback?.positionSec}
              height={cue.type === "video" ? 48 : 36}
              mediaKind={cue.type === "video" ? "video" : "audio"}
              hoverPreview={cue.type === "video"}
              seekable={!!playback}
              onSeek={(positionSec) => seekCue(cue.id, positionSec)}
            />
          </Box>
        )}
        {rangeLabel && (
          <Typography component="span" noWrap sx={{ fontSize: 11, color: "text.secondary" }}>
            {rangeLabel}
          </Typography>
        )}
        {playback && cueShowsPlaybackProgress(cue) && <PlaybackProgress progress={playback} />}
        {lightFadeProgress && <PlaybackProgress progress={lightFadeProgress} />}
        {canVolumeFadeTarget(cue) && (
          <ActiveCueLevelControl
            label={t("activeCues.volumeShort")}
            value={resolveEffectiveVolume(cue.id, cue.volume ?? 1, fadeFrameMs || undefined)}
            onChange={(volume) => {
              if (fadeProperty === "volume") clearFade(cue.id);
              updateCue(cue.id, { volume });
            }}
          />
        )}
        {canPanFadeTarget(cue) && (
          <ActiveCueLevelControl
            label={t("activeCues.panShort")}
            value={resolveEffectivePan(cue.id, cue.pan ?? 0, fadeFrameMs || undefined)}
            min={-1}
            max={1}
            formatValue={(v) => v.toFixed(2)}
            onChange={(pan) => {
              if (fadeProperty === "pan") clearFade(cue.id);
              updateCue(cue.id, { pan });
            }}
          />
        )}
        {canOpacityFadeTarget(cue) && (
          <ActiveCueLevelControl
            label={t("activeCues.opacityShort")}
            value={resolveEffectiveOpacity(cue.id, cue.opacity ?? 1, fadeFrameMs || undefined)}
            onChange={(opacity) => {
              if (fadeProperty === "opacity") clearFade(cue.id);
              updateCue(cue.id, { opacity });
            }}
          />
        )}
      </Box>
      {isPrimary && (
        <Box
          component="span"
          title={t("activeCues.lastTriggered")}
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
        title={t("activeCues.stopThisCue")}
        onClick={(e) => {
          e.stopPropagation();
          onStop();
        }}
      >
        {t("common.action.stop")}
      </Button>
    </Box>
  );
});
