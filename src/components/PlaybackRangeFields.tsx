import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
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
  const inTime = cue.inTime ?? 0;
  const outTime = cue.outTime;
  const isImage = cue.type === "image";
  const isVideo = cue.type === "video";
  const hasWaveform = (cue.type === "audio" || isVideo) && !!cue.assetPath;
  const effectiveOutLabel = outTime !== undefined ? formatTime(outTime) : "End of file";
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
        Playback range
      </Box>
      <Typography component="p" sx={inspectorGroupHintSx}>
        {hasWaveform
          ? isVideo
            ? "Drag the markers to set In and Out. Hover the waveform for a frame preview."
            : "Drag the markers on the waveform to set In and Out. Drag Out to the end to play through."
          : isImage
            ? "Clear duration or click ∞ to hold until a stop cue. Set seconds to auto-hide."
            : "In and Out are positions within the file (seconds). Leave Out empty to play to the end."}
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
            In {formatTime(inTime)} · Out {effectiveOutLabel}
            {sliceSec !== null && ` · ${formatTime(sliceSec)} slice`}
          </Typography>
        </Box>
      )}

      {!hasWaveform && !isImage && (
        <Box component="label" sx={inspectorFieldSx}>
          In
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
          {isImage ? "Duration (seconds)" : "Out"}
          <Box sx={inspectorTimeRowSx}>
            <input
              type="number"
              min={0}
              step={0.1}
              placeholder={isImage ? "∞" : "End of file"}
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
                  {outTime !== undefined ? formatTime(outTime) : "∞"}
                </Box>
                {!readOnly && outTime !== undefined && (
                  <Box
                    component="button"
                    type="button"
                    sx={inspectorInfiniteBtnSx}
                    title="Hold until stop cue"
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
          Slice length: {formatTime(sliceSec)}
        </Typography>
      )}
    </Box>
  );
}
