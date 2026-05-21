import { isFadeCue } from "../lib/fade";
import { formatStopTargetLabel, getStopTarget, isStopCue } from "../lib/cues";
import { useActiveCueList, useProjectStore } from "../stores/project";
import { useUiStore } from "../stores/ui";
import type { Cue } from "../types/cue";
import { CueTypeBadge } from "./CueTypeIcon";

interface StopInspectorFieldsProps {
  stopCue: Cue;
}

export function StopInspectorFields({ stopCue }: StopInspectorFieldsProps) {
  const readOnly = useUiStore((s) => s.showMode);
  const cues = useActiveCueList().cues;
  const updateCue = useProjectStore((s) => s.updateCue);
  const selectCue = useProjectStore((s) => s.selectCue);

  const target = getStopTarget(stopCue, cues);
  const stoppableCues = cues.filter(
    (c) => !isStopCue(c) && !isFadeCue(c) && c.id !== stopCue.id,
  );

  return (
    <fieldset className="inspector-group">
      <legend className="inspector-group-legend">Stop cue</legend>
      <p className="inspector-group-hint">
        When triggered (GO), this cue stops the target cue and any cues running
        as part of it (e.g. children in a parallel group).
      </p>

      <label className="inspector-field">
        Stops cue
        <select
          value={stopCue.stopTargetId ?? ""}
          disabled={readOnly}
          onChange={(e) =>
            updateCue(stopCue.id, {
              stopTargetId: e.currentTarget.value || undefined,
            })
          }
        >
          <option value="">— Select cue —</option>
          {stoppableCues.map((c) => (
            <option key={c.id} value={c.id}>
              {formatStopTargetLabel(c)} ({c.type})
            </option>
          ))}
        </select>
      </label>

      {target ? (
        <button
          type="button"
          className="btn btn-ghost btn-sm inspector-target-link"
          onClick={() => selectCue(target.id)}
        >
          <CueTypeBadge type={target.type} showLabel={false} />
          Go to target: {formatStopTargetLabel(target)}
        </button>
      ) : (
        <p className="inspector-hint cue-row-warning-text">
          Target cue missing — choose another cue or delete this stop cue.
        </p>
      )}
    </fieldset>
  );
}
