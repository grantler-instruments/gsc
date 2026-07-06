import Box from "@mui/material/Box";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";
import { resolveCueVideoBusId } from "../../lib/video-buses";
import { useProjectStore } from "../../stores/project";
import type { Cue } from "../../types/cue";
import { CueAssetPreview } from "../CueAssetPreview";
import { inspectorFieldLabelSx, inspectorFieldSx, inspectorHintSx } from "../inspectorSx";
import { LoopFields } from "../LoopFields";
import { PlaybackRangeFields } from "../PlaybackRangeFields";
import { SliderNumberField } from "../SliderNumberField";

interface MediaInspectorFieldsProps {
  cue: Cue;
  readOnly: boolean;
  onChange: (patch: Partial<Cue>) => void;
}

function VideoOutputFields({
  cue,
  readOnly,
  videoBuses,
  masterVideoOutputName,
  onChange,
}: {
  cue: Cue;
  readOnly: boolean;
  videoBuses: ReturnType<typeof useProjectStore.getState>["videoBuses"];
  masterVideoOutputName: string;
  onChange: (patch: Partial<Cue>) => void;
}) {
  const { t } = useTranslation();
  const resolvedVideoBusId = resolveCueVideoBusId(cue, videoBuses) ?? "";

  return (
    <>
      <Box sx={inspectorFieldSx}>
        <Typography component="label" sx={inspectorFieldLabelSx}>
          {t("inspector.videoBus")}
        </Typography>
        <Select
          size="small"
          fullWidth
          value={resolvedVideoBusId}
          disabled={readOnly}
          displayEmpty
          onChange={(event) => {
            const value = event.target.value;
            onChange(value ? { videoBusId: value } : { videoBusId: undefined });
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
    </>
  );
}

export function MediaInspectorFields({ cue, readOnly, onChange }: MediaInspectorFieldsProps) {
  const { t } = useTranslation();
  const audioBuses = useProjectStore((s) => s.audioBuses);
  const videoBuses = useProjectStore((s) => s.videoBuses);
  const masterVideoOutputName = useProjectStore((s) => s.masterVideoOutputName);
  const isMedia = cue.type === "audio" || cue.type === "video" || cue.type === "image";
  const isVisual = cue.type === "video" || cue.type === "image";
  if (!isMedia) return null;

  return (
    <>
      {isVisual && cue.assetPath && (
        <Box sx={inspectorFieldSx}>
          <Typography component="span" sx={inspectorFieldLabelSx}>
            {t("inspector.preview")}
          </Typography>
          <CueAssetPreview cue={cue} />
        </Box>
      )}

      <PlaybackRangeFields cue={cue} readOnly={readOnly} onChange={onChange} />

      {isVisual && (
        <VideoOutputFields
          cue={cue}
          readOnly={readOnly}
          videoBuses={videoBuses}
          masterVideoOutputName={masterVideoOutputName}
          onChange={onChange}
        />
      )}

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
          <Box sx={inspectorFieldSx}>
            <Typography component="label" sx={inspectorFieldLabelSx}>
              {t("inspector.audioBus")}
            </Typography>
            <Select
              size="small"
              fullWidth
              value={cue.audioBusId ?? ""}
              disabled={readOnly}
              displayEmpty
              onChange={(event) => {
                const value = event.target.value;
                onChange(value ? { audioBusId: value } : { audioBusId: undefined });
              }}
            >
              <MenuItem value="">{t("inspector.audioBusDirect")}</MenuItem>
              {audioBuses.map((bus) => (
                <MenuItem key={bus.id} value={bus.id}>
                  {bus.name}
                </MenuItem>
              ))}
            </Select>
          </Box>
        </>
      )}
    </>
  );
}
