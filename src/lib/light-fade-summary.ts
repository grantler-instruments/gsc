import { t } from "../i18n/t";
import type { Cue } from "../types/cue";
import type { Fixture } from "../types/fixture";
import { formatStopTargetLabel, getFadeTarget } from "./cues";
import { formatDmxCue } from "./dmx";
import { isLightFadeCue, resolveLightFadeEndDmx } from "./fade";

export interface LightFadeSummary {
  referenceLabel: string | null;
  fromLabel: string;
  toLabel: string;
  durationSec: number;
  scopeLabel: string;
}

export function resolveLightFadeSummary(
  fadeCue: Cue,
  cues: Cue[],
  fixtures: Fixture[],
): LightFadeSummary | null {
  if (!isLightFadeCue(fadeCue)) return null;

  const endDmx = resolveLightFadeEndDmx(fadeCue, cues, fixtures);
  if (!endDmx) return null;

  const target = getFadeTarget(fadeCue, cues);
  const scopeLabel =
    fadeCue.lightFadeChannels === "colorIntensity"
      ? t("inspector.lightFadeChannelsColorIntensity")
      : t("inspector.lightFadeChannelsAll");

  return {
    referenceLabel: target ? formatStopTargetLabel(target) : null,
    fromLabel: t("inspector.lightFadeFromLive"),
    toLabel: formatDmxCue(endDmx, fixtures),
    durationSec: fadeCue.fadeDuration ?? 2,
    scopeLabel,
  };
}

export function formatLightFadeCompactSummary(summary: LightFadeSummary): string {
  return t("inspector.lightFadeCompactSummary", {
    from: summary.fromLabel,
    to: summary.toLabel,
    duration: summary.durationSec,
    scope: summary.scopeLabel,
  });
}
