import Box from "@mui/material/Box";
import Switch from "@mui/material/Switch";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";
import { isInfiniteLoop, parseLoopIterationsInput } from "../lib/loop";
import type { Cue } from "../types/cue";
import {
  inspectorFieldSx,
  inspectorGroupCompactSx,
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
    <Box
      component="fieldset"
      aria-label={t("inspector.loop")}
      sx={{ ...inspectorGroupSx, ...inspectorGroupCompactSx }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 0 }}>
        <Box
          component="label"
          sx={{ display: "flex", alignItems: "center", gap: 0.5, flexShrink: 0 }}
        >
          <Switch
            size="small"
            slotProps={{ input: { role: "switch", "aria-label": t("inspector.loopPlayback") } }}
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
          <Typography
            component="span"
            sx={{ fontSize: 11, color: "text.secondary", fontWeight: 600 }}
          >
            {t("inspector.loop")}
          </Typography>
        </Box>
        <Box
          component="label"
          sx={{
            ...inspectorFieldSx,
            flexDirection: "row",
            alignItems: "center",
            flex: 1,
            minWidth: 0,
            justifyContent: "flex-end",
            "& input": { ...inspectorLoopIterationsSx, width: 56, minWidth: 0 },
            opacity: loop ? 1 : 0.5,
          }}
        >
          <Tooltip
            title={
              isInfiniteLoop(cue) ? t("inspector.loopInfiniteHint") : t("inspector.loopFiniteHint")
            }
            describeChild
            arrow
          >
            <Box component="span" tabIndex={0} sx={{ cursor: "help" }}>
              {t("inspector.iterations")}
            </Box>
          </Tooltip>
          <input
            type="text"
            inputMode="numeric"
            value={infinite ? "" : String(cue.loopCount ?? "")}
            placeholder={t("playback.infinite")}
            disabled={readOnly || !loop}
            onChange={(e) => applyIterations(e.currentTarget.value)}
            onBlur={(e) => applyIterations(e.currentTarget.value)}
          />
        </Box>
      </Box>
    </Box>
  );
}
