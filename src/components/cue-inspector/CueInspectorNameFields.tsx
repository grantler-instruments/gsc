import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { getCueDisplayName, isFadeCue, isStopCue } from "../../lib/cues";
import type { Cue } from "../../types/cue";
import {
  inspectorFieldLabelSx,
  inspectorFieldSx,
  inspectorGroupHintSx,
  inspectorReadonlySx,
} from "../inspectorSx";

interface CueInspectorNameFieldsProps {
  cue: Cue;
  cues: Cue[];
  readOnly: boolean;
  onNameChange: (name: string) => void;
  onNotesChange: (notes: string) => void;
}

export function CueInspectorNameFields({
  cue,
  cues,
  readOnly,
  onNameChange,
  onNotesChange,
}: CueInspectorNameFieldsProps) {
  return (
    <>
      {isStopCue(cue) || isFadeCue(cue) ? (
        <Box component="label" sx={inspectorFieldSx}>
          <Typography component="span" sx={inspectorFieldLabelSx}>
            Display name
          </Typography>
          <Typography component="p" sx={inspectorReadonlySx}>
            {getCueDisplayName(cue, cues)}
          </Typography>
          <Typography component="p" sx={inspectorGroupHintSx}>
            Always follows the target cue&apos;s name when that cue is renamed.
          </Typography>
        </Box>
      ) : (
        <TextField
          label="Name"
          value={cue.name}
          fullWidth
          slotProps={{ input: { readOnly } }}
          onChange={(e) => onNameChange(e.target.value)}
          sx={{ mb: 1.5 }}
        />
      )}

      <TextField
        label="Notes"
        multiline
        minRows={4}
        fullWidth
        value={cue.notes ?? ""}
        placeholder="Production notes, lines, reminders…"
        slotProps={{ input: { readOnly } }}
        onChange={(e) => onNotesChange(e.target.value)}
        sx={{ mb: 1.5 }}
      />
    </>
  );
}
