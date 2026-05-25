import { t } from "../i18n/t";
import type { Cue } from "../types/cue";
import {
  getChildCues,
  getStopTarget,
  isFadeCue,
  isParallelGroup,
  isSequenceGroup,
  isStopCue,
  isUtilityCue,
  isWaitCue,
  resolveStopCueIds,
} from "./cues";
import { triggerDmxCue } from "./trigger-dmx";
import { triggerFadeCue } from "./trigger-fade";

type CueOutcome = "go" | "stop";

export interface ParallelGroupFireActions {
  goMany: (ids: string[]) => void;
  stopMany: (ids: string[]) => void;
}

export interface ParallelGroupFireOptions {
  runSequence?: (cue: Cue, cues: Cue[]) => void;
  onSequenceStop?: () => void;
}

function tryGoLeaf(cueId: string, resolved: Map<string, CueOutcome>, leafIds: string[]): void {
  if (resolved.has(cueId)) return;
  resolved.set(cueId, "go");
  leafIds.push(cueId);
}

function applyStopFirstWins(
  stopCue: Cue,
  cues: Cue[],
  resolved: Map<string, CueOutcome>,
  stopMany: (ids: string[]) => void,
  onSequenceStop?: () => void,
): void {
  const target = getStopTarget(stopCue, cues);
  if (!target) return;

  const idsToStop: string[] = [];
  for (const id of resolveStopCueIds(target, cues)) {
    if (resolved.has(id)) continue;
    resolved.set(id, "stop");
    idsToStop.push(id);
  }
  if (idsToStop.length === 0) return;

  if (isSequenceGroup(target)) onSequenceStop?.();
  stopMany(idsToStop);
}

/** Walk parallel group children in list order; first stop/GO per cue id wins. */
export function walkParallelGroupChildren(
  group: Cue,
  cues: Cue[],
  resolved: Map<string, CueOutcome>,
  actions: ParallelGroupFireActions,
  options: ParallelGroupFireOptions = {},
): string[] {
  const leafIds: string[] = [];

  for (const child of getChildCues(cues, group.id)) {
    if (isStopCue(child)) {
      applyStopFirstWins(child, cues, resolved, actions.stopMany, options.onSequenceStop);
    } else if (isWaitCue(child)) {
      /* no-op */
    } else if (isFadeCue(child)) {
      triggerFadeCue(child, cues);
    } else if (child.type === "dmx") {
      triggerDmxCue(child);
    } else if (isSequenceGroup(child)) {
      options.runSequence?.(child, cues);
    } else if (isParallelGroup(child)) {
      leafIds.push(...walkParallelGroupChildren(child, cues, resolved, actions, options));
    } else {
      tryGoLeaf(child.id, resolved, leafIds);
    }
  }

  return leafIds;
}

/** Fire a parallel group and GO collected leaf ids. */
export function fireParallelGroupChildren(
  group: Cue,
  cues: Cue[],
  actions: ParallelGroupFireActions,
  options: ParallelGroupFireOptions = {},
): string[] {
  const resolved = new Map<string, CueOutcome>();
  const leafIds = walkParallelGroupChildren(group, cues, resolved, actions, options);
  if (leafIds.length > 0) actions.goMany(leafIds);
  return leafIds;
}

/** True when stop and GO would affect the same cue id (order determines the winner). */
export function getParallelGroupOrderConflict(
  group: Cue,
  cues: Cue[],
): { title: string; detail: string; tooltip: string } | null {
  if (!isParallelGroup(group)) return null;

  const goIds = new Set<string>();
  const stopIds = new Set<string>();

  const walkGroup = (groupId: string) => {
    for (const child of getChildCues(cues, groupId)) {
      if (isStopCue(child)) {
        const target = getStopTarget(child, cues);
        if (target) {
          for (const id of resolveStopCueIds(target, cues)) {
            stopIds.add(id);
          }
        }
      } else if (isParallelGroup(child)) {
        walkGroup(child.id);
      } else if (isSequenceGroup(child)) {
        goIds.add(child.id);
      } else if (!isUtilityCue(child)) {
        goIds.add(child.id);
      }
    }
  };

  walkGroup(group.id);

  for (const id of goIds) {
    if (stopIds.has(id)) {
      return {
        title: t("cueRow.orderConflict"),
        detail: t("cueRow.stopGoOverlap"),
        tooltip: t("cueRow.orderConflictTooltip"),
      };
    }
  }

  return null;
}
