import Box from "@mui/material/Box";
import { activeCueLevelSx } from "./activeCuesSx";

interface ActiveCueLevelControlProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
}

export function ActiveCueLevelControl({
  label,
  value,
  onChange,
}: ActiveCueLevelControlProps) {
  return (
    <Box
      component="label"
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
      sx={activeCueLevelSx}
    >
      <Box component="span" sx={{ width: 28, flexShrink: 0 }}>
        {label}
      </Box>
      <Box
        component="input"
        type="range"
        min={0}
        max={1}
        step={0.01}
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
        {Math.round(value * 100)}%
      </Box>
    </Box>
  );
}
