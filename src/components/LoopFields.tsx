import { isInfiniteLoop, parseLoopIterationsInput } from "../lib/loop";
import type { Cue } from "../types/cue";

interface LoopFieldsProps {
  cue: Cue;
  readOnly?: boolean;
  onChange: (patch: Partial<Cue>) => void;
}

export function LoopFields({
  cue,
  readOnly = false,
  onChange,
}: LoopFieldsProps) {
  const loop = cue.loop ?? false;
  const infinite = loop && isInfiniteLoop(cue);

  const applyIterations = (raw: string) => {
    const parsed = parseLoopIterationsInput(raw);
    if (parsed === "inf") {
      onChange({ loopCount: undefined, loopInfinite: undefined });
      return;
    }
    onChange({ loopCount: parsed, loopInfinite: false });
  };

  return (
    <fieldset className="inspector-group inspector-group-compact">
      <legend className="inspector-group-legend">Loop</legend>

      <label className="inspector-field inspector-field-checkbox">
        <input
          type="checkbox"
          checked={loop}
          disabled={readOnly}
          onChange={(e) => {
            const enabled = e.currentTarget.checked;
            onChange(
              enabled
                ? { loop: true, loopCount: undefined, loopInfinite: undefined }
                : {
                    loop: false,
                    loopInfinite: undefined,
                    loopCount: undefined,
                  },
            );
          }}
        />
        Loop playback
      </label>

      {loop && (
        <>
          <label className="inspector-field">
            Iterations
            <input
              type="text"
              inputMode="numeric"
              className="inspector-loop-iterations"
              value={infinite ? "" : String(cue.loopCount ?? "")}
              placeholder="∞"
              disabled={readOnly}
              onChange={(e) => applyIterations(e.currentTarget.value)}
              onBlur={(e) => applyIterations(e.currentTarget.value)}
            />
          </label>

          <p className="inspector-group-hint">
            {infinite
              ? "Repeats the In/Out slice until stopped. Enter a number (min 2) for a fixed count."
              : `Plays the In/Out slice ${cue.loopCount} times in a row. Clear for ∞.`}
          </p>
        </>
      )}
    </fieldset>
  );
}
