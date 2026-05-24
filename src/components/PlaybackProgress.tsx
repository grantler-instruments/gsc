import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";
import { formatPlaybackClock } from "../lib/time";
import type { CuePlaybackProgress } from "../stores/playback";

interface PlaybackProgressProps {
  progress: CuePlaybackProgress;
  /** Compact single-line layout for cue list rows. */
  compact?: boolean;
  /** Bar color — wait cues use warning tone. */
  tone?: "media" | "wait";
}

export function PlaybackProgress({
  progress,
  compact = false,
  tone = "media",
}: PlaybackProgressProps) {
  const { t } = useTranslation();
  const fillPct = Math.max(0, Math.min(100, progress.progress * 100));
  const ariaPct = Math.round(fillPct);
  const timeLabel = `${formatPlaybackClock(progress.positionSec)} / ${formatPlaybackClock(progress.endSec)}`;
  const loopLabel =
    progress.loopTotal !== undefined && progress.loopIteration !== undefined
      ? progress.loopTotal === "inf"
        ? `${progress.loopIteration}×`
        : `${progress.loopIteration}/${progress.loopTotal}`
      : null;

  const loopPart = loopLabel ? `, loop ${loopLabel}` : "";

  return (
    <Box
      role="progressbar"
      aria-valuenow={ariaPct}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={t("playback.progressAria", { time: timeLabel, loopPart })}
      sx={{
        display: "flex",
        alignItems: "center",
        gap: compact ? 0.75 : 1,
        width: "100%",
        minWidth: 0,
        ...(compact && { mt: 0.25 }),
      }}
    >
      <Box
        sx={{
          flex: 1,
          minWidth: 48,
          height: 4,
          borderRadius: 0.5,
          bgcolor: "divider",
          overflow: "hidden",
        }}
      >
        <Box
          sx={{
            height: "100%",
            borderRadius: 0.5,
            bgcolor: tone === "wait" ? "warning.main" : "success.main",
            width: `${fillPct}%`,
          }}
        />
      </Box>
      <Typography
        component="span"
        sx={{
          flexShrink: 0,
          minWidth: "17ch",
          fontSize: 10,
          fontVariantNumeric: "tabular-nums",
          color: "text.secondary",
          textAlign: "right",
        }}
      >
        {timeLabel}
      </Typography>
      {loopLabel && (
        <Typography
          component="span"
          title={
            progress.loopTotal === "inf"
              ? t("playback.loopIteration", { number: progress.loopIteration })
              : t("playback.loopOfTotal", {
                  current: progress.loopIteration,
                  total: progress.loopTotal,
                })
          }
          sx={{
            flexShrink: 0,
            fontSize: 10,
            fontVariantNumeric: "tabular-nums",
            color: "primary.main",
            lineHeight: 1,
            whiteSpace: "nowrap",
          }}
        >
          {progress.looping && "↻ "}
          {loopLabel}
        </Typography>
      )}
    </Box>
  );
}
