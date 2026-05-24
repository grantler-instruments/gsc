import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";
import { formatStopTargetLabel, getStopTarget, isStopCue, isWaitCue } from "../lib/cues";
import { isFadeCue } from "../lib/fade";
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
  const { t } = useTranslation();
  const readOnly = useUiStore((s) => s.showMode);
  const cues = useActiveCueList().cues;
  const updateCue = useProjectStore((s) => s.updateCue);
  const selectCue = useProjectStore((s) => s.selectCue);

  const target = getStopTarget(stopCue, cues);
  const stoppableCues = cues.filter(
    (c) => !isStopCue(c) && !isFadeCue(c) && !isWaitCue(c) && c.id !== stopCue.id,
  );

  return (
    <Box component="fieldset" sx={inspectorGroupSx}>
      <Box component="legend" sx={inspectorGroupLegendSx}>
        {t("inspector.stopCue")}
      </Box>
      <Typography component="p" sx={inspectorGroupHintSx}>
        {t("inspector.stopHint")}
      </Typography>

      <Box component="label" sx={inspectorFieldSx}>
        {t("inspector.stopsCue")}
        <select
          value={stopCue.stopTargetId ?? ""}
          disabled={readOnly}
          onChange={(e) =>
            updateCue(stopCue.id, {
              stopTargetId: e.currentTarget.value || undefined,
            })
          }
        >
          <option value="">{t("inspector.selectCuePlaceholder")}</option>
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
          {t("inspector.goToTarget", { label: formatStopTargetLabel(target) })}
        </Button>
      ) : (
        <Typography component="p" sx={inspectorHintWarningSx}>
          {t("inspector.stopTargetMissing")}
        </Typography>
      )}
    </Box>
  );
}
