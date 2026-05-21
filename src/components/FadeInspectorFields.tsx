import {
  canOpacityFadeTarget,
  canVolumeFadeTarget,
  fadeCueLabel,
  isFadeCue,
  isVolumeFadeCue,
  resolveFadeFromLevel,
} from "../lib/fade";
import {
  formatStopTargetLabel,
  getFadeTarget,
  isStopCue,
} from "../lib/cues";
import { useActiveCueList, useProjectStore } from "../stores/project";
import { useUiStore } from "../stores/ui";
import type { Cue, FadeCueType } from "../types/cue";
import { CueTypeBadge } from "./CueTypeIcon";

interface FadeInspectorFieldsProps {
  fadeCue: Cue;
}

export function FadeInspectorFields({ fadeCue }: FadeInspectorFieldsProps) {
  const readOnly = useUiStore((s) => s.showMode);
  const cues = useActiveCueList().cues;
  const updateCue = useProjectStore((s) => s.updateCue);
  const selectCue = useProjectStore((s) => s.selectCue);

  const fadeType = fadeCue.type as FadeCueType;
  const target = getFadeTarget(fadeCue, cues);
  const eligibleTargets = cues.filter((c) => {
    if (c.id === fadeCue.id || isStopCue(c) || isFadeCue(c)) return false;
    return fadeType === "volumeFade"
      ? canVolumeFadeTarget(c)
      : canOpacityFadeTarget(c);
  });

  const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

  return (
    <fieldset className="inspector-group">
      <legend className="inspector-group-legend">{fadeCueLabel(fadeType)}</legend>
      <p className="inspector-group-hint">
        When triggered (GO), fades the target cue&apos;s{" "}
        {fadeType === "volumeFade" ? "volume" : "opacity"} from its current
        level at that moment to the end level over the given duration.
      </p>

      <label className="inspector-field">
        Target cue
        <select
          value={fadeCue.fadeTargetId ?? ""}
          disabled={readOnly}
          onChange={(e) =>
            updateCue(fadeCue.id, {
              fadeTargetId: e.currentTarget.value || undefined,
            })
          }
        >
          <option value="">— Select cue —</option>
          {eligibleTargets.map((c) => (
            <option key={c.id} value={c.id}>
              {formatStopTargetLabel(c)} ({c.type})
            </option>
          ))}
        </select>
      </label>

      <label className="inspector-field">
        Duration (s)
        <input
          type="number"
          min={0.1}
          step={0.1}
          value={fadeCue.fadeDuration ?? 2}
          disabled={readOnly}
          onChange={(e) =>
            updateCue(fadeCue.id, {
              fadeDuration: Math.max(0.1, Number(e.currentTarget.value)),
            })
          }
        />
      </label>

      {target ? (
        <div className="inspector-field">
          <span className="inspector-field-label">Starts from (at GO)</span>
          <p className="inspector-readonly">
            {resolveFadeFromLevel(fadeCue, target).toFixed(2)}
            {isVolumeFadeCue(fadeCue)
              ? " — target cue volume now"
              : " — target cue opacity now"}
          </p>
        </div>
      ) : null}

      <label className="inspector-field">
        To
        <input
          type="number"
          min={0}
          max={1}
          step={0.01}
          value={fadeCue.fadeTo ?? 0}
          disabled={readOnly}
          onChange={(e) =>
            updateCue(fadeCue.id, {
              fadeTo: clamp01(Number(e.currentTarget.value)),
            })
          }
        />
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
          Target missing or invalid — choose an{" "}
          {fadeType === "volumeFade" ? "audio/video" : "video/image"} cue.
        </p>
      )}
    </fieldset>
  );
}
