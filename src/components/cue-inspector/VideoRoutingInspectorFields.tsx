import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import Accordion from "@mui/material/Accordion";
import AccordionDetails from "@mui/material/AccordionDetails";
import AccordionSummary from "@mui/material/AccordionSummary";
import Box from "@mui/material/Box";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Typography from "@mui/material/Typography";
import { useId } from "react";
import { useTranslation } from "react-i18next";
import { resolveCueVideoBusId } from "../../lib/video-buses";
import { useProjectStore } from "../../stores/project";
import type { Cue } from "../../types/cue";
import { inspectorFieldLabelSx, inspectorFieldSx, inspectorHintSx } from "../inspectorSx";

export function VideoRoutingInspectorFields({
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
  const videoBuses = useProjectStore((s) => s.videoBuses);
  const masterVideoOutputName = useProjectStore((s) => s.masterVideoOutputName);
  const resolvedVideoBusId = resolveCueVideoBusId(cue, videoBuses) ?? "";

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
          {t("inspector.videoRouting")}
        </Typography>
      </AccordionSummary>
      <AccordionDetails
        sx={{ px: 1.5, pt: 0.5, pb: 1.5, display: "flex", flexDirection: "column", gap: 1.5 }}
      >
        <Box sx={inspectorFieldSx}>
          <Typography id={`${id}-bus-label`} component="label" sx={inspectorFieldLabelSx}>
            {t("inspector.videoBus")}
          </Typography>
          <Select
            labelId={`${id}-bus-label`}
            size="small"
            fullWidth
            value={resolvedVideoBusId}
            disabled={readOnly}
            displayEmpty
            onChange={(event) => {
              const value = event.target.value;
              onChange({ videoBusId: value || undefined });
            }}
          >
            <MenuItem value="">{masterVideoOutputName}</MenuItem>
            {videoBuses.map((bus) => (
              <MenuItem key={bus.id} value={bus.id}>
                {bus.name}
              </MenuItem>
            ))}
          </Select>
          {videoBuses.length === 0 && !readOnly && (
            <Typography variant="caption" color="text.secondary" sx={inspectorHintSx}>
              {t("inspector.videoBusHint")}
            </Typography>
          )}
        </Box>
      </AccordionDetails>
    </Accordion>
  );
}
