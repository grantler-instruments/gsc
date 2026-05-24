import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";
import { getWaitDurationSec } from "../lib/wait";
import { useProjectStore } from "../stores/project";
import { useUiStore } from "../stores/ui";
import type { Cue } from "../types/cue";
import { inspectorFieldLabelSx, inspectorFieldSx, inspectorGroupHintSx } from "./inspectorSx";

interface WaitInspectorFieldsProps {
  waitCue: Cue;
}

export function WaitInspectorFields({ waitCue }: WaitInspectorFieldsProps) {
  const { t } = useTranslation();
  const readOnly = useUiStore((s) => s.showMode);
  const updateCue = useProjectStore((s) => s.updateCue);

  return (
    <>
      <Typography component="p" sx={inspectorGroupHintSx}>
        {t("inspector.waitHint")}
      </Typography>
      <Box component="label" sx={inspectorFieldSx}>
        <Typography component="span" sx={inspectorFieldLabelSx}>
          {t("inspector.durationSeconds")}
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
