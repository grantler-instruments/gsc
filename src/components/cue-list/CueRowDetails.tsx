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
import { getParallelGroupOrderConflict } from "../../lib/parallel-group-fire";
import { resolveFadeFromLevel, isLightFadeCue, isLightFadeReady, resolveLightFadeEndDmx } from "../../lib/fade";
import { formatDmxCue } from "../../lib/dmx";
import { formatMidiCue } from "../../lib/midi";
import { formatOscCue } from "../../lib/osc";
import { formatWaitDurationLabel } from "../../lib/wait";
import { formatLoopLabel } from "../../lib/loop";
import { formatPlaybackRangeLabel } from "../../lib/time";
import type { Cue } from "../../types/cue";
import type { RunningSequence } from "../../stores/transport";
import { useProjectStore } from "../../stores/project";
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
  const fixtures = useProjectStore((s) => s.fixtures);
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
  const fadeTargetMissing = isFade && !isLightFadeCue(cue) && !fadeTarget;
  const lightFadeTargetMissing =
    isLightFadeCue(cue) && Boolean(cue.fadeTargetId) && !fadeTarget;
  const lightFadeMissing =
    isLightFadeCue(cue) &&
    !lightFadeTargetMissing &&
    !isLightFadeReady(cue, fixtures, allCues);
  const lightFadeEndDmx =
    isLightFadeCue(cue) && cue.dmx
      ? resolveLightFadeEndDmx(cue, allCues, fixtures)
      : null;
  const fadeDetail =
    isFade && isLightFadeCue(cue) && lightFadeEndDmx
      ? `${formatDmxCue(lightFadeEndDmx, fixtures)} · ${cue.fadeDuration ?? 2}s`
      : isFade && fadeTarget
        ? `${resolveFadeFromLevel(cue, fadeTarget).toFixed(2)} → ${cue.fadeTo ?? 0} · ${cue.fadeDuration ?? 2}s`
        : null;
  const sequenceProgress =
    isSequence && runningSequence?.rootId === cue.id
      ? runningSequence
      : null;
  const rangeLabel =
    !isContainer &&
    !isUtility &&
    cue.type !== "midi" &&
    cue.type !== "osc" &&
    cue.type !== "dmx"
      ? formatPlaybackRangeLabel(cue.inTime, cue.outTime, cue.type === "image")
      : null;
  const loopLabel =
    cue.type === "audio" || cue.type === "video"
      ? formatLoopLabel(cue)
      : null;
  const assetWarning = getCueAssetWarning(cue);
  const parallelConflict = isParallel
    ? getParallelGroupOrderConflict(cue, allCues)
    : null;

  return (
    <>
      {isParallel && (
        <Typography component="span" sx={cueDetailSx}>
          {childCount === 0
            ? "Empty — drag cues here (parallel)"
            : `${childCount} cue${childCount === 1 ? "" : "s"} · parallel`}
        </Typography>
      )}
      {parallelConflict && (
        <Typography component="span" sx={cueDetailSx}>
          {parallelConflict.detail}
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
      {lightFadeTargetMissing && (
        <Typography component="span" sx={cueDetailSx}>
          Reference cue missing
        </Typography>
      )}
      {lightFadeMissing && (
        <Typography component="span" sx={cueDetailSx}>
          Add fixtures and channel levels
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
      {cue.type === "dmx" && cue.dmx && (
        <Typography component="span" sx={cueDetailSx}>
          {formatDmxCue(cue.dmx, fixtures)}
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
