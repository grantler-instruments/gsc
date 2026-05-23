import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import {
  canOpacityFadeTarget,
  canVolumeFadeTarget,
  fadeCueLabel,
  isFadeCue,
  isLightFadeCue,
  isVolumeFadeCue,
  resolveFadeFromLevel,
} from "../lib/fade";
import {
  formatStopTargetLabel,
  getFadeTarget,
  isStopCue,
  isWaitCue,
} from "../lib/cues";
import { useActiveCueList, useProjectStore } from "../stores/project";
import { useUiStore } from "../stores/ui";
import type { Cue, FadeCueType } from "../types/cue";
import { CueTypeBadge } from "./CueTypeIcon";
import { SliderNumberField } from "./SliderNumberField";
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

interface FadeInspectorFieldsProps {
  fadeCue: Cue;
}

export function FadeInspectorFields({ fadeCue }: FadeInspectorFieldsProps) {
  const readOnly = useUiStore((s) => s.showMode);
  const cues = useActiveCueList().cues;
  const updateCue = useProjectStore((s) => s.updateCue);
  const selectCue = useProjectStore((s) => s.selectCue);

  const fadeType = fadeCue.type as FadeCueType;
  const isLightFade = isLightFadeCue(fadeCue);
  const target = getFadeTarget(fadeCue, cues);
  const eligibleTargets = cues.filter((c) => {
    if (
      c.id === fadeCue.id ||
      isStopCue(c) ||
      isFadeCue(c) ||
      isWaitCue(c)
    ) {
      return false;
    }
    return fadeType === "volumeFade"
      ? canVolumeFadeTarget(c)
      : canOpacityFadeTarget(c);
  });

  const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

  if (isLightFade) {
    return (
      <Box component="fieldset" sx={inspectorGroupSx}>
        <Box component="legend" sx={inspectorGroupLegendSx}>
          {fadeCueLabel(fadeType)}
        </Box>
        <Typography component="p" sx={inspectorGroupHintSx}>
          When triggered (GO), fades from the current DMX output to the levels
          below over the given duration.
        </Typography>
        <Box component="label" sx={inspectorFieldSx}>
          Duration (s)
          <input
            type="number"
            min={0.1}
            step={0.1}
            value={fadeCue.fadeDuration ?? 2}
            disabled={readOnly}
            onChange={(e) =>
              updateCue(fadeCue.id, {
                fadeDuration: Math.max(0.1, Number(e.currentTarget.value)),
              })
            }
          />
        </Box>
      </Box>
    );
  }

  return (
    <Box component="fieldset" sx={inspectorGroupSx}>
      <Box component="legend" sx={inspectorGroupLegendSx}>
        {fadeCueLabel(fadeType)}
      </Box>
      <Typography component="p" sx={inspectorGroupHintSx}>
        When triggered (GO), fades the target cue&apos;s{" "}
        {fadeType === "volumeFade" ? "volume" : "opacity"} from its current
        level at that moment to the end level over the given duration.
      </Typography>

      <Box component="label" sx={inspectorFieldSx}>
        Target cue
        <select
          value={fadeCue.fadeTargetId ?? ""}
          disabled={readOnly}
          onChange={(e) =>
            updateCue(fadeCue.id, {
              fadeTargetId: e.currentTarget.value || undefined,
            })
          }
        >
          <option value="">— Select cue —</option>
          {eligibleTargets.map((c) => (
            <option key={c.id} value={c.id}>
              {formatStopTargetLabel(c)} ({c.type})
            </option>
          ))}
        </select>
      </Box>

      <Box component="label" sx={inspectorFieldSx}>
        Duration (s)
        <input
          type="number"
          min={0.1}
          step={0.1}
          value={fadeCue.fadeDuration ?? 2}
          disabled={readOnly}
          onChange={(e) =>
            updateCue(fadeCue.id, {
              fadeDuration: Math.max(0.1, Number(e.currentTarget.value)),
            })
          }
        />
      </Box>

      {target ? (
        <Box sx={inspectorFieldSx}>
          <Typography component="span" sx={inspectorFieldLabelSx}>
            Starts from (at GO)
          </Typography>
          <Typography component="p" sx={inspectorReadonlySx}>
            {resolveFadeFromLevel(fadeCue, target).toFixed(2)}
            {isVolumeFadeCue(fadeCue)
              ? " — target cue volume now"
              : " — target cue opacity now"}
          </Typography>
        </Box>
      ) : null}

      <SliderNumberField
        label="To"
        value={fadeCue.fadeTo ?? 0}
        min={0}
        max={1}
        step={0.01}
        readOnly={readOnly}
        onChange={(fadeTo) => updateCue(fadeCue.id, { fadeTo: clamp01(fadeTo) })}
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
          Go to target: {formatStopTargetLabel(target)}
        </Button>
      ) : (
        <Typography component="p" sx={inspectorHintWarningSx}>
          Target missing or invalid — choose a{" "}
          {fadeType === "volumeFade" ? "audio/video" : "video/image"} cue.
        </Typography>
      )}
    </Box>
  );
}
