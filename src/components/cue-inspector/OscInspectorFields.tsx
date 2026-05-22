import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { clampOscPort } from "../../lib/osc";
import type { Cue, OscCueData } from "../../types/cue";
import { OscArgsField } from "../OscArgsField";
import { inspectorFieldSx, inspectorGroupHintSx } from "../inspectorSx";

interface OscInspectorFieldsProps {
  cue: Cue;
  readOnly: boolean;
  oscDisabled: boolean;
  onPatch: (patch: Partial<OscCueData>) => void;
}

export function OscInspectorFields({
  cue,
  readOnly,
  oscDisabled,
  onPatch,
}: OscInspectorFieldsProps) {
  if (cue.type !== "osc" || !cue.osc) return null;

  const osc = cue.osc;

  return (
    <>
      {oscDisabled && (
        <Typography component="p" sx={inspectorGroupHintSx}>
          OSC sending requires the desktop app.
        </Typography>
      )}

      <Box component="label" sx={inspectorFieldSx}>
        Host
        <input
          type="text"
          value={osc.host}
          disabled={readOnly}
          onChange={(e) => onPatch({ host: e.currentTarget.value })}
        />
      </Box>

      <Box component="label" sx={inspectorFieldSx}>
        Port
        <input
          type="number"
          min={1}
          max={65535}
          value={osc.port}
          disabled={readOnly}
          onChange={(e) =>
            onPatch({ port: clampOscPort(Number(e.currentTarget.value)) })
          }
        />
      </Box>

      <Box component="label" sx={inspectorFieldSx}>
        Address
        <input
          type="text"
          value={osc.address}
          disabled={readOnly}
          placeholder="/cue/1/start"
          onChange={(e) => onPatch({ address: e.currentTarget.value })}
        />
      </Box>

      <OscArgsField
        cueId={cue.id}
        args={osc.args}
        readOnly={readOnly}
        onChange={(args) => onPatch({ args })}
      />
    </>
  );
}
