import type { Cue, DmxCueData, FadeCueType } from "../types/cue";
import type { Fixture } from "../types/fixture";
import { getFadeTarget, getStopTarget, isStopCue } from "./cues";
import { isFadeCue, isLightFadeReady, isValidFadeTarget, resolveLightFadeEndDmx } from "./fade";

export type TransportPreviewKind = "media" | "waveform" | "fixturePlot";

export interface TransportPreview {
  kind: TransportPreviewKind;
  crossedOut: boolean;
  /** Image/video frame or audio waveform source. */
  cue?: Cue;
  /** DMX / light-fade rig snapshot for the fixture plot thumb. */
  dmx?: DmxCueData;
}

export interface TransportPreviewBorrow {
  cue: Cue;
  crossedOut: boolean;
}

export function resolveTransportPreviewBorrow(
  cue: Cue,
  allCues: Cue[] | undefined,
): TransportPreviewBorrow {
  if (!allCues) {
    return { cue, crossedOut: false };
  }

  if (isStopCue(cue)) {
    const target = getStopTarget(cue, allCues);
    if (target) {
      return { cue: target, crossedOut: true };
    }
  }

  if (isFadeCue(cue) && cue.type !== "lightFade") {
    const target = getFadeTarget(cue, allCues);
    if (target && isValidFadeTarget(cue.type as FadeCueType, target)) {
      return { cue: target, crossedOut: false };
    }
  }

  return { cue, crossedOut: false };
}

export function resolveTransportPreview(
  cue: Cue,
  allCues: Cue[] | undefined,
  fixtures: Fixture[],
): TransportPreview | null {
  const borrowed = resolveTransportPreviewBorrow(cue, allCues);

  if (cue.type === "dmx" && cue.dmx && fixtures.length > 0) {
    return { kind: "fixturePlot", dmx: cue.dmx, crossedOut: false };
  }

  if (cue.type === "lightFade" && fixtures.length > 0 && allCues) {
    const endDmx = resolveLightFadeEndDmx(cue, allCues, fixtures);
    if (endDmx && isLightFadeReady(cue, fixtures, allCues)) {
      return { kind: "fixturePlot", dmx: endDmx, crossedOut: false };
    }
  }

  if (borrowed.cue.type === "dmx" && borrowed.cue.dmx && fixtures.length > 0) {
    return {
      kind: "fixturePlot",
      dmx: borrowed.cue.dmx,
      crossedOut: borrowed.crossedOut,
    };
  }

  const mediaCue = borrowed.cue;

  if (mediaCue.type === "audio" && mediaCue.assetPath) {
    return { kind: "waveform", cue: mediaCue, crossedOut: borrowed.crossedOut };
  }

  if (
    (mediaCue.type === "image" || mediaCue.type === "video") &&
    mediaCue.assetPath
  ) {
    return { kind: "media", cue: mediaCue, crossedOut: borrowed.crossedOut };
  }

  return null;
}
