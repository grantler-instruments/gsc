import Box from "@mui/material/Box";
import { activeCueLevelSx } from "./activeCuesSx";

interface ActiveCueLevelControlProps {
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  formatValue?: (value: number) => string;
  onChange: (value: number) => void;
}

export function ActiveCueLevelControl({
  label,
  value,
  min = 0,
  max = 1,
  step = 0.01,
  formatValue = (v) => `${Math.round(v * 100)}%`,
  onChange,
}: ActiveCueLevelControlProps) {
  return (
    <Box
      component="label"
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
      sx={activeCueLevelSx}
    >
      <Box component="span" sx={{ minWidth: 28, flexShrink: 0 }}>
        {label}
      </Box>
      <Box
        component="input"
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.currentTarget.value))}
      />
      <Box
        component="span"
        sx={{
          width: 32,
          flexShrink: 0,
          textAlign: "right",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {formatValue(value)}
      </Box>
    </Box>
  );
}
