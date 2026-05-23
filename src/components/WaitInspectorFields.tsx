import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { getWaitDurationSec } from "../lib/wait";
import { useProjectStore } from "../stores/project";
import { useUiStore } from "../stores/ui";
import type { Cue } from "../types/cue";
import { inspectorFieldLabelSx, inspectorFieldSx, inspectorGroupHintSx } from "./inspectorSx";

interface WaitInspectorFieldsProps {
  waitCue: Cue;
}

export function WaitInspectorFields({ waitCue }: WaitInspectorFieldsProps) {
  const readOnly = useUiStore((s) => s.showMode);
  const updateCue = useProjectStore((s) => s.updateCue);

  return (
    <>
      <Typography component="p" sx={inspectorGroupHintSx}>
        Timed pause with no media. When placed inside a sequence, holds for this duration before the
        next step runs.
      </Typography>
      <Box component="label" sx={inspectorFieldSx}>
        <Typography component="span" sx={inspectorFieldLabelSx}>
          Duration (s)
        </Typography>
        <input
          type="number"
          min={0.1}
          step={0.1}
          value={getWaitDurationSec(waitCue)}
          disabled={readOnly}
          onChange={(e) =>
            updateCue(waitCue.id, {
              waitDurationSec: Math.max(0.1, Number(e.currentTarget.value)),
            })
          }
        />
      </Box>
    </>
  );
}
