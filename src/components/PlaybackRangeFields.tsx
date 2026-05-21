import { formatTime, normalizePlaybackRange } from "../lib/time";
import type { Cue } from "../types/cue";
import { AudioWaveform } from "./AudioWaveform";

interface PlaybackRangeFieldsProps {
  cue: Cue;
  readOnly?: boolean;
  onChange: (patch: { inTime?: number; outTime?: number }) => void;
}

/**
 * In / Out points within a media file (QLab-style playback range).
 * Audio cues use the waveform; video/image keep numeric fields.
 */
export function PlaybackRangeFields({
  cue,
  readOnly = false,
  onChange,
}: PlaybackRangeFieldsProps) {
  const inTime = cue.inTime ?? 0;
  const outTime = cue.outTime;
  const isImage = cue.type === "image";
  const isAudio = cue.type === "audio";
  const hasWaveform = isAudio && !!cue.assetPath;
  const effectiveOutLabel =
    outTime !== undefined ? formatTime(outTime) : "End of file";
  const sliceSec =
    outTime !== undefined && outTime > inTime ? outTime - inTime : null;

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
    <fieldset className="inspector-group">
      <legend className="inspector-group-legend">Playback range</legend>
      <p className="inspector-group-hint">
        {hasWaveform
          ? "Drag the markers on the waveform to set In and Out. Drag Out to the end to play through."
          : isImage
            ? "How long the image stays on screen. In is always 0."
            : "In and Out are positions within the file (seconds). Leave Out empty to play to the end."}
      </p>

      {hasWaveform && (
        <div className="inspector-waveform-field">
          <AudioWaveform
            assetPath={cue.assetPath!}
            inTime={cue.inTime}
            outTime={cue.outTime}
            height={80}
            editable={!readOnly}
            onRangeChange={onChange}
          />
          <p className="inspector-waveform-range-summary">
            In {formatTime(inTime)} · Out {effectiveOutLabel}
            {sliceSec !== null && ` · ${formatTime(sliceSec)} slice`}
          </p>
        </div>
      )}

      {!hasWaveform && !isImage && (
        <label className="inspector-field">
          In
          <div className="inspector-time-row">
            <input
              type="number"
              min={0}
              step={0.1}
              value={inTime}
              disabled={readOnly}
              onChange={(e) => patchIn(Number(e.currentTarget.value))}
            />
            <span className="inspector-time-formatted">{formatTime(inTime)}</span>
          </div>
        </label>
      )}

      {!hasWaveform && (
        <label className="inspector-field">
          {isImage ? "Duration" : "Out"}
          <div className="inspector-time-row">
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
            {outTime !== undefined && (
              <span className="inspector-time-formatted">{formatTime(outTime)}</span>
            )}
          </div>
        </label>
      )}

      {!hasWaveform && !isImage && sliceSec !== null && (
        <p className="inspector-derived">
          Slice length: {formatTime(sliceSec)}
        </p>
      )}
    </fieldset>
  );
}
