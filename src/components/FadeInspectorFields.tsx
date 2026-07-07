import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";
import { getCueTypeLabel } from "../i18n/cueTypeLabels";
import { formatStopTargetLabel, getFadeTarget, isStopCue, isWaitCue } from "../lib/cues";
import { defaultDmxCueData, syncLightFadeDmxFromTarget } from "../lib/dmx";
import {
  canLightFadeTarget,
  canOpacityFadeTarget,
  canPanFadeTarget,
  canVolumeFadeTarget,
  isFadeCue,
  isLightFadeCue,
  resolveFadeFromLevel,
} from "../lib/fade";
import { formatLightFadeCompactSummary, resolveLightFadeSummary } from "../lib/light-fade-summary";
import { useActiveCueList, useProjectStore } from "../stores/project";
import { useUiStore } from "../stores/ui";
import type { Cue, FadeCueType } from "../types/cue";
import { CueTypeBadge } from "./CueTypeIcon";
import { DraftNumberInput } from "./DraftNumberInput";
import {
  inspectorFieldLabelSx,
  inspectorFieldSx,
  inspectorGroupHintSx,
  inspectorGroupLegendSx,
  inspectorGroupSx,
  inspectorHintWarningSx,
  inspectorReadonlySx,
  inspectorTargetLinkSx,
} from "./inspectorSx";
import { SliderNumberField } from "./SliderNumberField";

interface FadeInspectorFieldsProps {
  fadeCue: Cue;
}

export function FadeInspectorFields({ fadeCue }: FadeInspectorFieldsProps) {
  const { t } = useTranslation();
  const readOnly = useUiStore((s) => s.showMode);
  const fixtures = useProjectStore((s) => s.fixtures);
  const cues = useActiveCueList().cues;
  const updateCue = useProjectStore((s) => s.updateCue);
  const selectCue = useProjectStore((s) => s.selectCue);

  const fadeType = fadeCue.type as FadeCueType;
  const isLightFade = isLightFadeCue(fadeCue);
  const target = getFadeTarget(fadeCue, cues);
  const eligibleTargets = cues.filter((c) => {
    if (c.id === fadeCue.id || isStopCue(c) || isFadeCue(c) || isWaitCue(c)) {
      return false;
    }
    if (fadeType === "volumeFade") return canVolumeFadeTarget(c);
    if (fadeType === "panFade") return canPanFadeTarget(c);
    if (fadeType === "lightFade") return canLightFadeTarget(c);
    return canOpacityFadeTarget(c);
  });

  const clamp01 = (n: number) => Math.max(0, Math.min(1, n));
  const clampPan = (n: number) => Math.max(-1, Math.min(1, n));
  const isPanFade = fadeType === "panFade";
  const lightFadeSummary = isLightFade ? resolveLightFadeSummary(fadeCue, cues, fixtures) : null;

  if (isLightFade) {
    return (
      <Box component="fieldset" sx={inspectorGroupSx}>
        <Box component="legend" sx={inspectorGroupLegendSx}>
          {getCueTypeLabel(fadeType)}
        </Box>
        <Typography component="p" sx={inspectorGroupHintSx}>
          {t("inspector.lightFadeHint")}
        </Typography>

        <Box component="label" sx={inspectorFieldSx}>
          {t("inspector.referenceCue")}
          <select
            value={fadeCue.fadeTargetId ?? ""}
            disabled={readOnly}
            onChange={(e) => {
              const nextTargetId = e.currentTarget.value || undefined;
              const nextTarget = nextTargetId
                ? cues.find((cue) => cue.id === nextTargetId)
                : undefined;
              updateCue(fadeCue.id, {
                fadeTargetId: nextTargetId,
                ...(nextTarget?.type === "dmx" && nextTarget.dmx
                  ? {
                      dmx: syncLightFadeDmxFromTarget(
                        fadeCue.dmx ?? defaultDmxCueData(fixtures),
                        nextTarget.dmx,
                        fixtures,
                      ),
                    }
                  : {}),
              });
            }}
          >
            <option value="">{t("inspector.selectCuePlaceholder")}</option>
            {eligibleTargets.map((c) => (
              <option key={c.id} value={c.id}>
                {formatStopTargetLabel(c)} ({c.type})
              </option>
            ))}
          </select>
        </Box>

        <Box component="label" sx={inspectorFieldSx}>
          {t("inspector.durationSecondsField")}
          <DraftNumberInput
            value={fadeCue.fadeDuration ?? 2}
            readOnly={readOnly}
            onChange={(fadeDuration) => updateCue(fadeCue.id, { fadeDuration })}
          />
        </Box>

        <Box component="label" sx={inspectorFieldSx}>
          {t("inspector.lightFadeChannels")}
          <select
            value={fadeCue.lightFadeChannels ?? "all"}
            disabled={readOnly}
            onChange={(event) =>
              updateCue(fadeCue.id, {
                lightFadeChannels:
                  event.currentTarget.value === "colorIntensity" ? "colorIntensity" : "all",
              })
            }
          >
            <option value="all">{t("inspector.lightFadeChannelsAll")}</option>
            <option value="colorIntensity">{t("inspector.lightFadeChannelsColorIntensity")}</option>
          </select>
        </Box>

        {lightFadeSummary ? (
          <Box sx={inspectorFieldSx}>
            <Typography component="span" sx={inspectorFieldLabelSx}>
              {t("inspector.lightFadeRange")}
            </Typography>
            <Typography component="p" sx={inspectorReadonlySx}>
              {formatLightFadeCompactSummary(lightFadeSummary)}
            </Typography>
            {lightFadeSummary.referenceLabel ? (
              <Typography component="p" sx={{ ...inspectorReadonlySx, mt: 0.5, fontSize: 12 }}>
                {t("inspector.lightFadeReference", {
                  label: lightFadeSummary.referenceLabel,
                })}
              </Typography>
            ) : null}
          </Box>
        ) : null}

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
            {t("inspector.lightFadeChooseHint")}
          </Typography>
        )}
      </Box>
    );
  }

  return (
    <Box component="fieldset" sx={inspectorGroupSx}>
      <Box component="legend" sx={inspectorGroupLegendSx}>
        {getCueTypeLabel(fadeType)}
      </Box>
      <Typography component="p" sx={inspectorGroupHintSx}>
        {fadeType === "volumeFade"
          ? t("inspector.volumeFadeHint")
          : fadeType === "panFade"
            ? t("inspector.panFadeHint")
            : t("inspector.opacityFadeHint")}
      </Typography>

      <Box component="label" sx={inspectorFieldSx}>
        {t("inspector.targetCue")}
        <select
          value={fadeCue.fadeTargetId ?? ""}
          disabled={readOnly}
          onChange={(e) =>
            updateCue(fadeCue.id, {
              fadeTargetId: e.currentTarget.value || undefined,
            })
          }
        >
          <option value="">{t("inspector.selectCuePlaceholder")}</option>
          {eligibleTargets.map((c) => (
            <option key={c.id} value={c.id}>
              {formatStopTargetLabel(c)} ({c.type})
            </option>
          ))}
        </select>
      </Box>

      <Box component="label" sx={inspectorFieldSx}>
        {t("inspector.durationSecondsField")}
        <DraftNumberInput
          value={fadeCue.fadeDuration ?? 2}
          readOnly={readOnly}
          onChange={(fadeDuration) => updateCue(fadeCue.id, { fadeDuration })}
        />
      </Box>

      {target ? (
        <Box sx={inspectorFieldSx}>
          <Typography component="span" sx={inspectorFieldLabelSx}>
            {t("inspector.startsFromAtGo")}
          </Typography>
          <Typography component="p" sx={inspectorReadonlySx}>
            {resolveFadeFromLevel(fadeCue, target).toFixed(2)}
            {t("inspector.startsFromCurrent")}
          </Typography>
        </Box>
      ) : null}

      <SliderNumberField
        label={t("inspector.to")}
        value={fadeCue.fadeTo ?? 0}
        min={isPanFade ? -1 : 0}
        max={1}
        step={0.01}
        readOnly={readOnly}
        onChange={(fadeTo) =>
          updateCue(fadeCue.id, {
            fadeTo: isPanFade ? clampPan(fadeTo) : clamp01(fadeTo),
          })
        }
        inputWidth={48}
      />

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
          {t("inspector.fadeTargetInvalid")}
        </Typography>
      )}
    </Box>
  );
}
