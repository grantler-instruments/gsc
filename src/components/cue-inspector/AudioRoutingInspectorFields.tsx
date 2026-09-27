import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import Accordion from "@mui/material/Accordion";
import AccordionDetails from "@mui/material/AccordionDetails";
import AccordionSummary from "@mui/material/AccordionSummary";
import Typography from "@mui/material/Typography";
import { useId } from "react";
import { useTranslation } from "react-i18next";
import type { Cue } from "../../types/cue";
import { inspectorFieldLabelSx } from "../inspectorSx";
import { AudioBusSelect } from "./AudioBusSelect";
import { LiveAudioInspectorFields } from "./LiveAudioInspectorFields";

export function AudioRoutingInspectorFields({
  cue,
  readOnly,
  onChange,
}: {
  cue: Cue;
  readOnly: boolean;
  onChange: (patch: Partial<Cue>) => void;
}) {
  const { t } = useTranslation();
  const id = useId();
  return (
    <Accordion
      key={cue.id}
      disableGutters
      elevation={0}
      sx={{ border: 1, borderColor: "divider", "&::before": { display: "none" } }}
    >
      <AccordionSummary
        id={`${id}-header`}
        aria-controls={`${id}-content`}
        expandIcon={<ExpandMoreIcon fontSize="small" />}
        sx={{ minHeight: 36, px: 1.5, "& .MuiAccordionSummary-content": { my: 0.75 } }}
      >
        <Typography component="span" sx={inspectorFieldLabelSx}>
          {t("inspector.audioRouting")}
        </Typography>
      </AccordionSummary>
      <AccordionDetails
        sx={{ px: 1.5, pt: 0.5, pb: 1.5, display: "flex", flexDirection: "column", gap: 1.5 }}
      >
        {cue.type === "liveAudio" && (
          <LiveAudioInspectorFields cue={cue} readOnly={readOnly} onChange={onChange} />
        )}
        <AudioBusSelect
          value={cue.audioBusId}
          readOnly={readOnly}
          onChange={(audioBusId) => onChange({ audioBusId })}
        />
      </AccordionDetails>
    </Accordion>
  );
}
