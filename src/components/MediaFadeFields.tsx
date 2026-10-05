import Box from "@mui/material/Box";
import Tooltip from "@mui/material/Tooltip";
import { useTranslation } from "react-i18next";
import { getMediaDurationSec } from "../lib/media-duration";
import { clampMediaFadeSec, MEDIA_FADE_CURVES, mediaFadeCurve } from "../lib/media-fade";
import { getPlaybackSliceSec } from "../lib/playback-slice";
import type { Cue, MediaFadeCurve } from "../types/cue";
import { DraftNumberInput } from "./DraftNumberInput";
import { inspectorFieldSx, inspectorGroupLegendSx, inspectorGroupSx } from "./inspectorSx";

const CURVE_LABEL_KEYS: Record<MediaFadeCurve, string> = {
  linear: "inspector.fadeCurveLinear",
  equalPower: "inspector.fadeCurveEqualPower",
  sCurve: "inspector.fadeCurveSCurve",
  exponential: "inspector.fadeCurveExponential",
};

const fadeRowSx = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(84px, 1fr))",
  gap: 1,
};

interface MediaFadeFieldsProps {
  cue: Cue;
  readOnly?: boolean;
  onChange: (patch: Pick<Partial<Cue>, "fadeIn" | "fadeOut" | "fadeCurve">) => void;
}

/**
 * Built-in fade in / fade out lengths and curve for cues without a waveform
 * (images, speech); waveform cues set these on the waveform knobs.
 */
export function MediaFadeFields({ cue, readOnly = false, onChange }: MediaFadeFieldsProps) {
  const { t } = useTranslation();
  const fadeIn = cue.fadeIn ?? 0;
  const fadeOut = cue.fadeOut ?? 0;
  const knownSlice =
    cue.outTime !== undefined ||
    (cue.assetPath && getMediaDurationSec(cue.assetPath) !== undefined);
  const sliceSec = knownSlice
    ? getPlaybackSliceSec(cue, cue.assetPath ? getMediaDurationSec(cue.assetPath) : undefined)
    : undefined;

  return (
    <Box component="fieldset" sx={inspectorGroupSx}>
      <Box component="legend" sx={inspectorGroupLegendSx}>
        <Tooltip title={t("inspector.fadesHint")} describeChild arrow>
          <Box component="span" tabIndex={0} sx={{ cursor: "help" }}>
            {t("inspector.fades")}
          </Box>
        </Tooltip>
      </Box>
      <Box sx={fadeRowSx}>
        <Box component="label" sx={inspectorFieldSx}>
          {t("inspector.fadeInSeconds")}
          <DraftNumberInput
            value={fadeIn}
            min={0}
            readOnly={readOnly}
            onChange={(value) => onChange({ fadeIn: clampMediaFadeSec(value, fadeOut, sliceSec) })}
          />
        </Box>
        <Box component="label" sx={inspectorFieldSx}>
          {t("inspector.fadeOutSeconds")}
          <DraftNumberInput
            value={fadeOut}
            min={0}
            readOnly={readOnly}
            onChange={(value) => onChange({ fadeOut: clampMediaFadeSec(value, fadeIn, sliceSec) })}
          />
        </Box>
        <Box component="label" sx={inspectorFieldSx}>
          {t("inspector.fadeCurve")}
          <select
            value={mediaFadeCurve(cue)}
            disabled={readOnly}
            onChange={(e) => onChange({ fadeCurve: e.currentTarget.value as MediaFadeCurve })}
          >
            {MEDIA_FADE_CURVES.map((curve) => (
              <option key={curve} value={curve}>
                {t(CURVE_LABEL_KEYS[curve])}
              </option>
            ))}
          </select>
        </Box>
      </Box>
    </Box>
  );
}
