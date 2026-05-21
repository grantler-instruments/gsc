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
 * Audio and video cues use the waveform; images keep numeric fields.
 */
export function PlaybackRangeFields({
  cue,
  readOnly = false,
  onChange,
}: PlaybackRangeFieldsProps) {
  const inTime = cue.inTime ?? 0;
  const outTime = cue.outTime;
  const isImage = cue.type === "image";
  const isVideo = cue.type === "video";
  const hasWaveform =
    (cue.type === "audio" || isVideo) && !!cue.assetPath;
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
          ? isVideo
            ? "Drag the markers to set In and Out. Hover the waveform for a frame preview."
            : "Drag the markers on the waveform to set In and Out. Drag Out to the end to play through."
          : isImage
            ? "Clear duration or click ∞ to hold until a stop cue. Set seconds to auto-hide."
            : "In and Out are positions within the file (seconds). Leave Out empty to play to the end."}
      </p>

      {hasWaveform && (
        <div className="inspector-waveform-field">
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
          {isImage ? "Duration (seconds)" : "Out"}
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
            {isImage ? (
              <>
                <span className="inspector-time-formatted">
                  {outTime !== undefined ? formatTime(outTime) : "∞"}
                </span>
                {!readOnly && outTime !== undefined && (
                  <button
                    type="button"
                    className="inspector-infinite-btn"
                    title="Hold until stop cue"
                    onClick={() => patchOut(undefined)}
                  >
                    ∞
                  </button>
                )}
              </>
            ) : (
              outTime !== undefined && (
                <span className="inspector-time-formatted">
                  {formatTime(outTime)}
                </span>
              )
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
