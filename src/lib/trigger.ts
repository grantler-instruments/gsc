import type { Cue } from "../types/cue";
import {
  getChildCues,
  getStopTarget,
  isFadeCue,
  isParallelGroup,
  isSequenceGroup,
  isStopCue,
  isWaitCue,
  resolveStopCueIds,
} from "./cues";
import { fireParallelGroupChildren } from "./parallel-group-fire";
import { cancelAllSequences, runSequence } from "./sequence-runner";
import { triggerDmxCue } from "./trigger-dmx";
import { triggerFadeCue } from "./trigger-fade";

type GoMany = (ids: string[]) => void;
type GoOne = (id: string) => void;
type StopMany = (ids: string[]) => void;

function triggerParallelGroup(
  cue: Cue,
  cues: Cue[],
  actions: { goMany: GoMany; stopMany: StopMany },
): string[] {
  return fireParallelGroupChildren(cue, cues, actions, {
    onSequenceStop: cancelAllSequences,
  });
}

export function triggerGo(
  cue: Cue,
  cues: Cue[],
  actions: { goMany: GoMany; go: GoOne; stopMany: StopMany },
): { triggered: string[]; emptyContainer: boolean } {
  if (isStopCue(cue)) {
    const target = getStopTarget(cue, cues);
    if (target) triggerStopCue(target, cues, actions.stopMany);
    return { triggered: [], emptyContainer: !target };
  }

  if (isWaitCue(cue)) {
    return { triggered: [], emptyContainer: false };
  }

  if (isFadeCue(cue)) {
    const ok = triggerFadeCue(cue, cues);
    return { triggered: [], emptyContainer: !ok };
  }

  if (cue.type === "dmx") {
    const ok = triggerDmxCue(cue);
    return { triggered: [], emptyContainer: !ok };
  }

  if (isSequenceGroup(cue)) {
    const { started } = runSequence(cue, cues);
    return { triggered: [], emptyContainer: !started };
  }

  if (isParallelGroup(cue)) {
    const ids = triggerParallelGroup(cue, cues, actions);
    const hasChildren = getChildCues(cues, cue.id).length > 0;
    return {
      triggered: ids,
      emptyContainer: !hasChildren,
    };
  }

  actions.go(cue.id);
  return { triggered: [cue.id], emptyContainer: false };
}

export function triggerStopCue(cue: Cue, cues: Cue[], stopMany: StopMany): void {
  if (isSequenceGroup(cue)) {
    cancelAllSequences();
  }
  stopMany(resolveStopCueIds(cue, cues));
}
