import Box from "@mui/material/Box";
import { useEffect, useState } from "react";
import {
  inspectorFieldLabelSx,
  inspectorFieldSx,
  inspectorSliderNumberInputSx,
  inspectorSliderRowSx,
} from "./inspectorSx";

interface SliderNumberFieldProps {
  label?: React.ReactNode;
  value: number;
  min: number;
  max: number;
  step?: number;
  disabled?: boolean;
  readOnly?: boolean;
  onChange: (value: number) => void;
  inputWidth?: number;
}

function clampValue(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function SliderNumberField({
  label,
  value,
  min,
  max,
  step = 1,
  disabled = false,
  readOnly = false,
  onChange,
  inputWidth = 56,
}: SliderNumberFieldProps) {
  const [draft, setDraft] = useState(String(value));
  const locked = readOnly || disabled;

  useEffect(() => {
    setDraft(String(value));
  }, [value]);

  const applyValue = (next: number) => {
    onChange(clampValue(next, min, max));
  };

  const commitDraft = () => {
    const parsed = Number(draft);
    if (!Number.isFinite(parsed)) {
      setDraft(String(value));
      return;
    }
    applyValue(parsed);
  };

  const controls = (
    <Box sx={inspectorSliderRowSx}>
      <Box
        component="input"
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={locked}
        onChange={(event) => applyValue(Number(event.currentTarget.value))}
      />
      <Box
        component="input"
        type="number"
        min={min}
        max={max}
        step={step}
        value={draft}
        readOnly={readOnly}
        disabled={disabled}
        sx={inspectorSliderNumberInputSx(inputWidth)}
        onChange={(event) => setDraft(event.currentTarget.value)}
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
    </Box>
  );

  if (label == null) return controls;

  return (
    <Box component="label" sx={inspectorFieldSx}>
      {typeof label === "string" ? (
        <Box component="span" sx={inspectorFieldLabelSx}>
          {label}
        </Box>
      ) : (
        label
      )}
      {controls}
    </Box>
  );
}
