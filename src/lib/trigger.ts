import type { SequenceScope } from "../stores/transport";
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
import { cancelSequence, runSequence } from "./sequence-runner";
import { triggerDmxCue } from "./trigger-dmx";
import { triggerFadeCue } from "./trigger-fade";

type GoMany = (ids: string[]) => void;
type GoOne = (id: string) => void;
type StopMany = (ids: string[]) => void;

export interface TriggerGoOptions {
  /** Scope for any sequence started by this GO. Defaults to "main". */
  sequenceScope?: SequenceScope;
}

function triggerParallelGroup(
  cue: Cue,
  cues: Cue[],
  actions: { goMany: GoMany; stopMany: StopMany },
  scope: SequenceScope,
): string[] {
  return fireParallelGroupChildren(cue, cues, actions, {
    runSequence: (child, list) => runSequence(child, list, { scope }),
    onSequenceStop: (rootId) => cancelSequence(rootId),
  });
}

export function triggerGo(
  cue: Cue,
  cues: Cue[],
  actions: { goMany: GoMany; go: GoOne; stopMany: StopMany },
  options: TriggerGoOptions = {},
): { triggered: string[]; emptyContainer: boolean } {
  const scope = options.sequenceScope ?? "main";
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
    const { started } = runSequence(cue, cues, { scope });
    return { triggered: [], emptyContainer: !started };
  }

  if (isParallelGroup(cue)) {
    const ids = triggerParallelGroup(cue, cues, actions, scope);
    const hasChildren = getChildCues(cues, cue.id).length > 0;
    return {
      triggered: ids,
      emptyContainer: !hasChildren,
    };
  }

  actions.go(cue.id);
  // MIDI/OSC are momentary triggers — fire output then leave the active list (like a flash GO).
  if (cue.type === "midi" || cue.type === "osc") {
    actions.stopMany([cue.id]);
  }
  return { triggered: [cue.id], emptyContainer: false };
}

export function triggerStopCue(cue: Cue, cues: Cue[], stopMany: StopMany): void {
  if (isSequenceGroup(cue)) {
    cancelSequence(cue.id);
  }
  stopMany(resolveStopCueIds(cue, cues));
}
