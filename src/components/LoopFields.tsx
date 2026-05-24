import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";
import { isInfiniteLoop, parseLoopIterationsInput } from "../lib/loop";
import type { Cue } from "../types/cue";
import {
  inspectorFieldCheckboxSx,
  inspectorFieldSx,
  inspectorGroupCompactSx,
  inspectorGroupHintSx,
  inspectorGroupLegendSx,
  inspectorGroupSx,
  inspectorLoopIterationsSx,
} from "./inspectorSx";

interface LoopFieldsProps {
  cue: Cue;
  readOnly?: boolean;
  onChange: (patch: Partial<Cue>) => void;
}

export function LoopFields({ cue, readOnly = false, onChange }: LoopFieldsProps) {
  const { t } = useTranslation();
  const loop = cue.loop ?? false;
  const infinite = loop && isInfiniteLoop(cue);

  const applyIterations = (raw: string) => {
    const parsed = parseLoopIterationsInput(raw);
    if (parsed === "inf") {
      onChange({ loopCount: undefined });
      return;
    }
    onChange({ loopCount: parsed });
  };

  return (
    <Box component="fieldset" sx={{ ...inspectorGroupSx, ...inspectorGroupCompactSx }}>
      <Box component="legend" sx={inspectorGroupLegendSx}>
        {t("inspector.loop")}
      </Box>

      <Box component="label" sx={inspectorFieldCheckboxSx}>
        <input
          type="checkbox"
          checked={loop}
          disabled={readOnly}
          onChange={(e) => {
            const enabled = e.currentTarget.checked;
            onChange(
              enabled
                ? { loop: true, loopCount: undefined }
                : { loop: false, loopCount: undefined },
            );
          }}
        />
        {t("inspector.loopPlayback")}
      </Box>

      {loop && (
        <>
          <Box component="label" sx={{ ...inspectorFieldSx, "& input": inspectorLoopIterationsSx }}>
            {t("inspector.iterations")}
            <input
              type="text"
              inputMode="numeric"
              value={infinite ? "" : String(cue.loopCount ?? "")}
              placeholder={t("playback.infinite")}
              disabled={readOnly}
              onChange={(e) => applyIterations(e.currentTarget.value)}
              onBlur={(e) => applyIterations(e.currentTarget.value)}
            />
          </Box>

          <Typography component="p" sx={inspectorGroupHintSx}>
            {infinite ? t("inspector.loopInfiniteHint") : t("inspector.loopFiniteHint")}
          </Typography>
        </>
      )}
    </Box>
  );
}
