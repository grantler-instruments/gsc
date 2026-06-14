import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";
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
  onTriggerNoteChange: (triggerNote: string) => void;
}

export function CueInspectorNameFields({
  cue,
  cues,
  readOnly,
  onNameChange,
  onNotesChange,
  onTriggerNoteChange,
}: CueInspectorNameFieldsProps) {
  const { t } = useTranslation();

  return (
    <>
      {isStopCue(cue) || isFadeCue(cue) ? (
        <Box component="label" sx={inspectorFieldSx}>
          <Typography component="span" sx={inspectorFieldLabelSx}>
            {t("inspector.displayName")}
          </Typography>
          <Typography component="p" sx={inspectorReadonlySx}>
            {getCueDisplayName(cue, cues)}
          </Typography>
          <Typography component="p" sx={inspectorGroupHintSx}>
            {t("inspector.displayNameHint")}
          </Typography>
        </Box>
      ) : (
        <TextField
          label={t("inspector.name")}
          value={cue.name}
          fullWidth
          slotProps={{ input: { readOnly } }}
          onChange={(e) => onNameChange(e.target.value)}
          sx={{ mb: 1.5 }}
        />
      )}

      <TextField
        label={t("inspector.notes")}
        multiline
        minRows={1}
        maxRows={4}
        size="small"
        fullWidth
        value={cue.notes ?? ""}
        placeholder={t("inspector.notesPlaceholder")}
        slotProps={{ input: { readOnly } }}
        onChange={(e) => onNotesChange(e.target.value)}
        sx={{ mb: 1 }}
      />

      <TextField
        label={t("inspector.triggerNote")}
        multiline
        minRows={1}
        maxRows={4}
        size="small"
        fullWidth
        value={cue.triggerNote ?? ""}
        placeholder={t("inspector.triggerNotePlaceholder")}
        slotProps={{ input: { readOnly } }}
        onChange={(e) => onTriggerNoteChange(e.target.value)}
        sx={{ mb: 1 }}
      />
    </>
  );
}
