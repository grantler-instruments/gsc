import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";
import { getCueAssetWarning } from "../../lib/cue-asset";
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
import { formatDmxCue } from "../../lib/dmx";
import {
  isLightFadeCue,
  isLightFadeReady,
  resolveFadeFromLevel,
  resolveLightFadeEndDmx,
} from "../../lib/fade";
import { formatLoopLabel } from "../../lib/loop";
import { formatMidiCue } from "../../lib/midi";
import { formatOscCue } from "../../lib/osc";
import { getParallelGroupOrderConflict } from "../../lib/parallel-group-fire";
import { cueShowsPlaybackProgress } from "../../lib/playback-slice";
import { formatPlaybackRangeLabel } from "../../lib/time";
import { formatWaitDurationLabel } from "../../lib/wait";
import { useDmxFadeCueProgress } from "../../hooks/useDmxFadeCueProgress";
import type { CuePlaybackProgress } from "../../stores/playback";
import { useProjectStore } from "../../stores/project";
import type { RunningSequence } from "../../stores/transport";
import { cueDetailSx } from "../../theme/cueStyles";
import type { Cue } from "../../types/cue";
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
  const { t } = useTranslation();
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
  const lightFadeTargetMissing = isLightFadeCue(cue) && Boolean(cue.fadeTargetId) && !fadeTarget;
  const lightFadeMissing =
    isLightFadeCue(cue) && !lightFadeTargetMissing && !isLightFadeReady(cue, fixtures, allCues);
  const lightFadeEndDmx =
    isLightFadeCue(cue) && cue.dmx ? resolveLightFadeEndDmx(cue, allCues, fixtures) : null;
  const fadeDetail =
    isFade && isLightFadeCue(cue) && lightFadeEndDmx
      ? `${formatDmxCue(lightFadeEndDmx, fixtures)} · ${cue.fadeDuration ?? 2}s`
      : isFade && fadeTarget
        ? `${resolveFadeFromLevel(cue, fadeTarget).toFixed(2)} → ${cue.fadeTo ?? 0} · ${cue.fadeDuration ?? 2}s`
        : null;
  const sequenceProgress =
    isSequence && runningSequence?.rootId === cue.id ? runningSequence : null;
  const rangeLabel =
    !isContainer && !isUtility && cue.type !== "midi" && cue.type !== "osc" && cue.type !== "dmx"
      ? formatPlaybackRangeLabel(cue.inTime, cue.outTime, cue.type === "image")
      : null;
  const loopLabel = cue.type === "audio" || cue.type === "video" ? formatLoopLabel(cue) : null;
  const assetWarning = getCueAssetWarning(cue);
  const parallelConflict = isParallel ? getParallelGroupOrderConflict(cue, allCues) : null;
  const lightFadeProgress = useDmxFadeCueProgress(cue.id);

  return (
    <>
      {isParallel && (
        <Typography component="span" sx={cueDetailSx}>
          {childCount === 0
            ? t("cueRow.emptyParallel")
            : t("cueRow.parallelCount", { count: childCount })}
        </Typography>
      )}
      {parallelConflict && (
        <Typography component="span" sx={cueDetailSx}>
          {t("cueRow.stopGoOverlap")}
        </Typography>
      )}
      {isSequence && (
        <Typography component="span" sx={cueDetailSx}>
          {sequenceProgress
            ? t("cueRow.playingStep", {
                current: sequenceProgress.currentStep + 1,
                total: sequenceProgress.stepCount,
              })
            : childCount === 0
              ? t("cueRow.emptySequential")
              : t("cueRow.sequentialCount", { count: childCount })}
        </Typography>
      )}
      {stopTargetMissing && (
        <Typography component="span" sx={cueDetailSx}>
          {t("cueRow.targetCueMissing")}
        </Typography>
      )}
      {fadeTargetMissing && (
        <Typography component="span" sx={cueDetailSx}>
          {t("cueRow.fadeTargetMissing")}
        </Typography>
      )}
      {lightFadeTargetMissing && (
        <Typography component="span" sx={cueDetailSx}>
          {t("cueRow.referenceMissing")}
        </Typography>
      )}
      {lightFadeMissing && (
        <Typography component="span" sx={cueDetailSx}>
          {t("cueRow.addFixturesAndLevels")}
        </Typography>
      )}
      {isWait && (
        <Typography component="span" sx={cueDetailSx}>
          {t("cueRow.holdDuration", { duration: formatWaitDurationLabel(cue) })}
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
        <PlaybackProgress progress={playback} compact tone={isWait ? "wait" : "media"} />
      )}
      {isLightFadeCue(cue) && lightFadeProgress && (
        <PlaybackProgress progress={lightFadeProgress} compact />
      )}
    </>
  );
}
