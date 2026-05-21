import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import { isFadeCue } from "../lib/fade";
import { formatStopTargetLabel, getStopTarget, isStopCue } from "../lib/cues";
import { useActiveCueList, useProjectStore } from "../stores/project";
import { useUiStore } from "../stores/ui";
import type { Cue } from "../types/cue";
import { CueTypeBadge } from "./CueTypeIcon";
import {
  inspectorFieldSx,
  inspectorGroupHintSx,
  inspectorGroupLegendSx,
  inspectorGroupSx,
  inspectorHintWarningSx,
  inspectorTargetLinkSx,
} from "./inspectorSx";

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
    <Box component="fieldset" sx={inspectorGroupSx}>
      <Box component="legend" sx={inspectorGroupLegendSx}>
        Stop cue
      </Box>
      <Typography component="p" sx={inspectorGroupHintSx}>
        When triggered (GO), this cue stops the target cue and any cues running
        as part of it (e.g. children in a parallel group).
      </Typography>

      <Box component="label" sx={inspectorFieldSx}>
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
      </Box>

      {target ? (
        <Button
          variant="text"
          size="small"
          onClick={() => selectCue(target.id)}
          sx={inspectorTargetLinkSx}
        >
          <CueTypeBadge type={target.type} showLabel={false} />
          Go to target: {formatStopTargetLabel(target)}
        </Button>
      ) : (
        <Typography component="p" sx={inspectorHintWarningSx}>
          Target cue missing — choose another cue or delete this stop cue.
        </Typography>
      )}
    </Box>
  );
}
