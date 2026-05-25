import { useEffect, useState } from "react";

interface DraftNumberInputProps {
  value: number;
  min?: number;
  step?: number;
  disabled?: boolean;
  readOnly?: boolean;
  onChange: (value: number) => void;
}

export function DraftNumberInput({
  value,
  min = 0.1,
  step = 0.1,
  disabled = false,
  readOnly = false,
  onChange,
}: DraftNumberInputProps) {
  const [draft, setDraft] = useState(String(value));
  const locked = readOnly || disabled;

  useEffect(() => {
    setDraft(String(value));
  }, [value]);

  const commitDraft = () => {
    const parsed = Number(draft);
    if (!Number.isFinite(parsed)) {
      setDraft(String(value));
      return;
    }
    onChange(Math.max(min, parsed));
  };

  return (
    <input
      type="number"
      min={min}
      step={step}
      value={draft}
      disabled={disabled}
      readOnly={readOnly}
      onChange={(e) => setDraft(e.currentTarget.value)}
      onBlur={locked ? undefined : commitDraft}
      onKeyDown={
        locked
          ? undefined
          : (event) => {
              if (event.key === "Enter") {
                event.currentTarget.blur();
              }
            }
      }
    />
  );
}
