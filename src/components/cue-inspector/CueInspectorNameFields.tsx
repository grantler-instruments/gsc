import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import Accordion from "@mui/material/Accordion";
import AccordionDetails from "@mui/material/AccordionDetails";
import AccordionSummary from "@mui/material/AccordionSummary";
import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useId } from "react";
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
  const notesId = useId();

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

      <Accordion
        key={cue.id}
        disableGutters
        elevation={0}
        sx={{ mb: 1, border: 1, borderColor: "divider", "&::before": { display: "none" } }}
      >
        <AccordionSummary
          id={`${notesId}-header`}
          aria-controls={`${notesId}-content`}
          expandIcon={<ExpandMoreIcon fontSize="small" />}
          sx={{ minHeight: 36, px: 1.5, "& .MuiAccordionSummary-content": { my: 0.75 } }}
        >
          <Typography component="span" sx={inspectorFieldLabelSx}>
            {t("inspector.notes")}
          </Typography>
        </AccordionSummary>
        <AccordionDetails
          sx={{ px: 1.5, pt: 0.5, pb: 1.5, display: "flex", flexDirection: "column", gap: 1.5 }}
        >
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
          />
        </AccordionDetails>
      </Accordion>
    </>
  );
}
