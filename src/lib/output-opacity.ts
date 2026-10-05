import type { OutputLayer } from "../types/output";
import { isMediaFadeAnimating, type MediaFadeEnvelope, mediaFadeGainAt } from "./media-fade";

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

/**
 * Whole run length of a layer, for its end fade. Videos without an Out point
 * need the media duration; images without a duration hold forever.
 */
function outputLayerSliceSec(layer: OutputLayer, mediaDurationSec?: number): number | undefined {
  if (layer.type === "image") return layer.outTime !== undefined ? layer.sliceSec : undefined;
  if (mediaDurationSec !== undefined && Number.isFinite(mediaDurationSec)) {
    const end =
      layer.outTime !== undefined ? Math.min(mediaDurationSec, layer.outTime) : mediaDurationSec;
    return Math.max(0.01, end - layer.inTime);
  }
  return layer.outTime !== undefined ? layer.sliceSec : undefined;
}

function layerEnvelope(
  layer: OutputLayer,
  mediaDurationSec?: number,
): MediaFadeEnvelope | undefined {
  const fade = layer.fade;
  if (!fade) return undefined;
  const sliceSec = outputLayerSliceSec(layer, mediaDurationSec);
  const plays = layer.loopCount;
  return {
    fadeInSec: fade.fadeInSec,
    fadeOutSec: fade.fadeOutSec,
    curve: fade.curve,
    totalRunSec: sliceSec !== undefined && plays !== "inf" ? sliceSec * plays : undefined,
  };
}

/** Layer opacity including its built-in fade in / fade out at `nowMs`. */
export function outputLayerOpacityAt(
  layer: OutputLayer,
  nowMs = Date.now(),
  mediaDurationSec?: number,
): number {
  const envelope = layerEnvelope(layer, mediaDurationSec);
  const base = clamp01(layer.opacity);
  if (!envelope) return base;
  return clamp01(base * mediaFadeGainAt(envelope, layer.goAtMs, nowMs, layer.fade?.release));
}

/** True while the layer's fade envelope still changes over time. */
export function isOutputLayerFadeAnimating(
  layer: OutputLayer,
  nowMs = Date.now(),
  mediaDurationSec?: number,
): boolean {
  const envelope = layerEnvelope(layer, mediaDurationSec);
  if (!envelope) return false;
  return isMediaFadeAnimating(envelope, layer.goAtMs, nowMs, layer.fade?.release);
}

function layerMediaDuration(node: HTMLElement): number | undefined {
  const video = node.querySelector("video");
  return video && Number.isFinite(video.duration) ? video.duration : undefined;
}

/** Update output layer opacity in the DOM without React re-renders. */
export function applyOutputLayerOpacities(layers: OutputLayer[], nowMs = Date.now()): void {
  for (const layer of layers) {
    const node = document.querySelector<HTMLElement>(`[data-gsc-output-layer="${layer.cueId}"]`);
    if (!node) continue;
    node.style.opacity = String(outputLayerOpacityAt(layer, nowMs, layerMediaDuration(node)));
  }
}
