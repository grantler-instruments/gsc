import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";
import { formatTime, normalizePlaybackRange } from "../lib/time";
import type { Cue } from "../types/cue";
import { AudioWaveform } from "./AudioWaveform";
import {
  inspectorDerivedSx,
  inspectorFieldSx,
  inspectorGroupHintSx,
  inspectorGroupLegendSx,
  inspectorGroupSx,
  inspectorInfiniteBtnSx,
  inspectorTimeFormattedSx,
  inspectorTimeRowSx,
  inspectorWaveformFieldSx,
  inspectorWaveformRangeSummarySx,
} from "./inspectorSx";

interface PlaybackRangeFieldsProps {
  cue: Cue;
  readOnly?: boolean;
  onChange: (patch: { inTime?: number; outTime?: number }) => void;
}

/**
 * In / Out points within a media file (QLab-style playback range).
 * Audio and video cues use the waveform; images keep numeric fields.
 */
export function PlaybackRangeFields({ cue, readOnly = false, onChange }: PlaybackRangeFieldsProps) {
  const { t } = useTranslation();
  const inTime = cue.inTime ?? 0;
  const outTime = cue.outTime;
  const isImage = cue.type === "image";
  const isVideo = cue.type === "video";
  const hasWaveform = (cue.type === "audio" || isVideo) && !!cue.assetPath;
  const effectiveOutLabel = outTime !== undefined ? formatTime(outTime) : t("inspector.endOfFile");
  const sliceSec = outTime !== undefined && outTime > inTime ? outTime - inTime : null;

  const patchIn = (value: number) => {
    const nextIn = Math.max(0, value);
    onChange({
      inTime: nextIn,
      outTime: normalizePlaybackRange(nextIn, outTime),
    });
  };

  const patchOut = (value: number | undefined) => {
    if (value === undefined) {
      onChange({ outTime: undefined });
      return;
    }
    onChange({ outTime: normalizePlaybackRange(inTime, value) });
  };

  return (
    <Box component="fieldset" sx={inspectorGroupSx}>
      <Box component="legend" sx={inspectorGroupLegendSx}>
        {t("inspector.playbackRange")}
      </Box>
      <Typography component="p" sx={inspectorGroupHintSx}>
        {hasWaveform
          ? t("inspector.waveformRangeHint")
          : isImage
            ? t("inspector.imageRangeHint")
            : t("inspector.numericRangeHint")}
      </Typography>

      {hasWaveform && (
        <Box sx={inspectorWaveformFieldSx}>
          <AudioWaveform
            assetPath={cue.assetPath!}
            inTime={cue.inTime}
            outTime={cue.outTime}
            height={isVideo ? 88 : 80}
            editable={!readOnly}
            onRangeChange={onChange}
            mediaKind={isVideo ? "video" : "audio"}
            hoverPreview={isVideo && !readOnly}
          />
          <Typography component="p" sx={inspectorWaveformRangeSummarySx}>
            {t("inspector.rangeSummary", {
              inTime: formatTime(inTime),
              outLabel: effectiveOutLabel,
              slice: sliceSec !== null ? formatTime(sliceSec) : "",
            })}
          </Typography>
        </Box>
      )}

      {!hasWaveform && !isImage && (
        <Box component="label" sx={inspectorFieldSx}>
          {t("inspector.inPoint")}
          <Box sx={inspectorTimeRowSx}>
            <input
              type="number"
              min={0}
              step={0.1}
              value={inTime}
              disabled={readOnly}
              onChange={(e) => patchIn(Number(e.currentTarget.value))}
            />
            <Box component="span" sx={inspectorTimeFormattedSx}>
              {formatTime(inTime)}
            </Box>
          </Box>
        </Box>
      )}

      {!hasWaveform && (
        <Box component="label" sx={inspectorFieldSx}>
          {isImage ? t("inspector.durationSecondsField") : t("inspector.outPoint")}
          <Box sx={inspectorTimeRowSx}>
            <input
              type="number"
              min={0}
              step={0.1}
              placeholder={isImage ? t("playback.infinite") : t("inspector.endOfFile")}
              value={outTime ?? ""}
              disabled={readOnly}
              onChange={(e) => {
                const raw = e.currentTarget.value;
                if (raw === "") {
                  patchOut(undefined);
                  return;
                }
                patchOut(Number(raw));
              }}
            />
            {isImage ? (
              <>
                <Box component="span" sx={inspectorTimeFormattedSx}>
                  {outTime !== undefined ? formatTime(outTime) : t("playback.infinite")}
                </Box>
                {!readOnly && outTime !== undefined && (
                  <Box
                    component="button"
                    type="button"
                    sx={inspectorInfiniteBtnSx}
                    title={t("inspector.holdUntilStop")}
                    onClick={() => patchOut(undefined)}
                  >
                    ∞
                  </Box>
                )}
              </>
            ) : (
              outTime !== undefined && (
                <Box component="span" sx={inspectorTimeFormattedSx}>
                  {formatTime(outTime)}
                </Box>
              )
            )}
          </Box>
        </Box>
      )}

      {!hasWaveform && !isImage && sliceSec !== null && (
        <Typography component="p" sx={inspectorDerivedSx}>
          {t("inspector.sliceLength", { time: formatTime(sliceSec) })}
        </Typography>
      )}
    </Box>
  );
}
