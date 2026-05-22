import Typography from "@mui/material/Typography";
import { getCueAssetWarning } from "../../lib/cue-asset";
import { cueShowsPlaybackProgress } from "../../lib/playback-slice";
import {
  getFadeTarget,
  getStopTarget,
  isContainerCue,
  isFadeCue,
  isParallelGroup,
  isSequenceGroup,
  isStopCue,
  isUtilityCue,
  isWaitCue,
} from "../../lib/cues";
import { resolveFadeFromLevel } from "../../lib/fade";
import { formatMidiCue } from "../../lib/midi";
import { formatOscCue } from "../../lib/osc";
import { formatWaitDurationLabel } from "../../lib/wait";
import { formatLoopLabel } from "../../lib/loop";
import { formatPlaybackRangeLabel } from "../../lib/time";
import type { Cue } from "../../types/cue";
import type { RunningSequence } from "../../stores/transport";
import type { CuePlaybackProgress } from "../../stores/playback";
import { cueDetailSx } from "../../theme/cueStyles";
import { PlaybackProgress } from "../PlaybackProgress";

interface CueRowDetailsProps {
  cue: Cue;
  allCues: Cue[];
  childCount: number;
  active: boolean;
  runningSequence: RunningSequence | null;
  playback: CuePlaybackProgress | undefined;
}

export function CueRowDetails({
  cue,
  allCues,
  childCount,
  active,
  runningSequence,
  playback,
}: CueRowDetailsProps) {
  const isContainer = isContainerCue(cue);
  const isParallel = isParallelGroup(cue);
  const isSequence = isSequenceGroup(cue);
  const isStop = isStopCue(cue);
  const isFade = isFadeCue(cue);
  const isWait = isWaitCue(cue);
  const isUtility = isUtilityCue(cue);
  const stopTarget = isStop ? getStopTarget(cue, allCues) : undefined;
  const fadeTarget = isFade ? getFadeTarget(cue, allCues) : undefined;
  const stopTargetMissing = isStop && !stopTarget;
  const fadeTargetMissing = isFade && !fadeTarget;
  const fadeDetail =
    isFade && fadeTarget
      ? `${resolveFadeFromLevel(cue, fadeTarget).toFixed(2)} → ${cue.fadeTo ?? 0} · ${cue.fadeDuration ?? 2}s`
      : null;
  const sequenceProgress =
    isSequence && runningSequence?.rootId === cue.id
      ? runningSequence
      : null;
  const rangeLabel =
    !isContainer && !isUtility && cue.type !== "midi" && cue.type !== "osc"
      ? formatPlaybackRangeLabel(cue.inTime, cue.outTime, cue.type === "image")
      : null;
  const loopLabel =
    cue.type === "audio" || cue.type === "video"
      ? formatLoopLabel(cue)
      : null;
  const assetWarning = getCueAssetWarning(cue);

  return (
    <>
      {isParallel && (
        <Typography component="span" sx={cueDetailSx}>
          {childCount === 0
            ? "Empty — drag cues here (parallel)"
            : `${childCount} cue${childCount === 1 ? "" : "s"} · parallel`}
        </Typography>
      )}
      {isSequence && (
        <Typography component="span" sx={cueDetailSx}>
          {sequenceProgress
            ? `Playing step ${sequenceProgress.currentStep + 1} of ${sequenceProgress.stepCount}`
            : childCount === 0
              ? "Empty — drag cues here (sequential)"
              : `${childCount} cue${childCount === 1 ? "" : "s"} · sequential`}
        </Typography>
      )}
      {stopTargetMissing && (
        <Typography component="span" sx={cueDetailSx}>
          Target cue missing
        </Typography>
      )}
      {fadeTargetMissing && (
        <Typography component="span" sx={cueDetailSx}>
          Fade target missing
        </Typography>
      )}
      {isWait && (
        <Typography component="span" sx={cueDetailSx}>
          Hold {formatWaitDurationLabel(cue)}
        </Typography>
      )}
      {assetWarning && (
        <Typography component="span" sx={cueDetailSx}>
          {assetWarning.detail}
        </Typography>
      )}
      {fadeDetail && (
        <Typography component="span" sx={cueDetailSx}>
          {fadeDetail}
        </Typography>
      )}
      {cue.type === "midi" && cue.midi && (
        <Typography component="span" sx={cueDetailSx}>
          {formatMidiCue(cue.midi)}
        </Typography>
      )}
      {cue.type === "osc" && cue.osc && (
        <Typography component="span" sx={cueDetailSx}>
          {formatOscCue(cue.osc)}
        </Typography>
      )}
      {rangeLabel && (
        <Typography component="span" sx={cueDetailSx}>
          {rangeLabel}
        </Typography>
      )}
      {loopLabel && (
        <Typography component="span" sx={cueDetailSx}>
          {loopLabel}
        </Typography>
      )}
      {active && playback && cueShowsPlaybackProgress(cue) && (
        <PlaybackProgress
          progress={playback}
          compact
          tone={isWait ? "wait" : "media"}
        />
      )}
    </>
  );
}
