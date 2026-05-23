import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { isInfiniteLoop, parseLoopIterationsInput } from "../lib/loop";
import type { Cue } from "../types/cue";
import {
  inspectorFieldCheckboxSx,
  inspectorFieldSx,
  inspectorGroupCompactSx,
  inspectorGroupHintSx,
  inspectorGroupLegendSx,
  inspectorGroupSx,
  inspectorLoopIterationsSx,
} from "./inspectorSx";

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
      onChange({ loopCount: undefined });
      return;
    }
    onChange({ loopCount: parsed });
  };

  return (
    <Box
      component="fieldset"
      sx={{ ...inspectorGroupSx, ...inspectorGroupCompactSx }}
    >
      <Box component="legend" sx={inspectorGroupLegendSx}>
        Loop
      </Box>

      <Box component="label" sx={inspectorFieldCheckboxSx}>
        <input
          type="checkbox"
          checked={loop}
          disabled={readOnly}
          onChange={(e) => {
            const enabled = e.currentTarget.checked;
            onChange(
              enabled
                ? { loop: true, loopCount: undefined }
                : { loop: false, loopCount: undefined },
            );
          }}
        />
        Loop playback
      </Box>

      {loop && (
        <>
          <Box
            component="label"
            sx={{ ...inspectorFieldSx, "& input": inspectorLoopIterationsSx }}
          >
            Iterations
            <input
              type="text"
              inputMode="numeric"
              value={infinite ? "" : String(cue.loopCount ?? "")}
              placeholder="∞"
              disabled={readOnly}
              onChange={(e) => applyIterations(e.currentTarget.value)}
              onBlur={(e) => applyIterations(e.currentTarget.value)}
            />
          </Box>

          <Typography component="p" sx={inspectorGroupHintSx}>
            {infinite
              ? "Repeats the In/Out slice until stopped. Enter a number (min 2) for a fixed count."
              : `Plays the In/Out slice ${cue.loopCount} times in a row. Clear for ∞.`}
          </Typography>
        </>
      )}
    </Box>
  );
}
