import { formatPlaybackClock } from "../lib/time";
import type { CuePlaybackProgress } from "../stores/playback";

interface PlaybackProgressProps {
  progress: CuePlaybackProgress;
  /** Compact single-line layout for cue list rows. */
  compact?: boolean;
}

export function PlaybackProgress({
  progress,
  compact = false,
}: PlaybackProgressProps) {
  const fillPct = Math.max(0, Math.min(100, progress.progress * 100));
  const ariaPct = Math.round(fillPct);
  const timeLabel = `${formatPlaybackClock(progress.positionSec)} / ${formatPlaybackClock(progress.endSec)}`;
  const loopLabel =
    progress.loopTotal !== undefined && progress.loopIteration !== undefined
      ? progress.loopTotal === "inf"
        ? `${progress.loopIteration}×`
        : `${progress.loopIteration}/${progress.loopTotal}`
      : null;

  return (
    <div
      className={["playback-progress", compact && "playback-progress-compact"]
        .filter(Boolean)
        .join(" ")}
      role="progressbar"
      aria-valuenow={ariaPct}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`Playback ${timeLabel}${loopLabel ? `, loop ${loopLabel}` : ""}`}
    >
      <div className="playback-progress-track">
        <div
          className="playback-progress-fill"
          style={{ width: `${fillPct}%` }}
        />
      </div>
      <span className="playback-progress-time">{timeLabel}</span>
      {loopLabel && (
        <span
          className="playback-progress-loop"
          title={
            progress.loopTotal === "inf"
              ? `Loop iteration ${progress.loopIteration}`
              : `Loop ${progress.loopIteration} of ${progress.loopTotal}`
          }
        >
          {progress.looping && "↻ "}
          {loopLabel}
        </span>
      )}
    </div>
  );
}
