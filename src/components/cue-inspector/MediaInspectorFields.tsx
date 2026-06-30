import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";
import type { Cue } from "../../types/cue";
import { CueAssetPreview } from "../CueAssetPreview";
import { inspectorFieldLabelSx, inspectorFieldSx } from "../inspectorSx";
import { LoopFields } from "../LoopFields";
import { PlaybackRangeFields } from "../PlaybackRangeFields";
import { SliderNumberField } from "../SliderNumberField";

interface MediaInspectorFieldsProps {
  cue: Cue;
  readOnly: boolean;
  onChange: (patch: Partial<Cue>) => void;
}

export function MediaInspectorFields({ cue, readOnly, onChange }: MediaInspectorFieldsProps) {
  const { t } = useTranslation();
  const isMedia = cue.type === "audio" || cue.type === "video" || cue.type === "image";
  if (!isMedia) return null;

  return (
    <>
      {(cue.type === "video" || cue.type === "image") && cue.assetPath && (
        <Box sx={inspectorFieldSx}>
          <Typography component="span" sx={inspectorFieldLabelSx}>
            {t("inspector.preview")}
          </Typography>
          <CueAssetPreview cue={cue} />
        </Box>
      )}

      <PlaybackRangeFields cue={cue} readOnly={readOnly} onChange={onChange} />

      {(cue.type === "audio" || cue.type === "video") && (
        <>
          <LoopFields cue={cue} readOnly={readOnly} onChange={onChange} />
          <SliderNumberField
            label={t("inspector.volume")}
            value={cue.volume ?? 1}
            min={0}
            max={1}
            step={0.01}
            readOnly={readOnly}
            onChange={(volume) => onChange({ volume })}
            inputWidth={48}
          />
          <SliderNumberField
            label={t("inspector.pan")}
            value={cue.pan ?? 0}
            min={-1}
            max={1}
            step={0.01}
            readOnly={readOnly}
            onChange={(pan) => onChange({ pan })}
            inputWidth={48}
          />
        </>
      )}

      {(cue.type === "video" || cue.type === "image") && (
        <SliderNumberField
          label={t("inspector.opacity")}
          value={cue.opacity ?? 1}
          min={0}
          max={1}
          step={0.01}
          readOnly={readOnly}
          onChange={(opacity) => onChange({ opacity })}
          inputWidth={48}
        />
      )}
    </>
  );
}
