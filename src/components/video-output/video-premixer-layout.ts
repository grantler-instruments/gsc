import { busHasVideoEffectType, VIDEO_EFFECT_TYPES } from "../../lib/video-effects";
import type { VideoEffect } from "../../types/video-effect";

export const FX_BLOCK_WIDTH = 120;
export const ADD_EFFECT_COLUMN_WIDTH = 72;
export const PREMIXER_EMPTY_WIDTH = 120;
export const PREMIXER_EFFECTS_PADDING_X = 8;
export const PREMIXER_EFFECTS_GAP = 8;

export interface VideoEffectsHost {
  effects?: VideoEffect[];
}

export function premixerContentWidth(host: VideoEffectsHost): number {
  const list = host.effects ?? [];
  const availableTypes = VIDEO_EFFECT_TYPES.filter((type) => !busHasVideoEffectType(host, type));
  const addColumnWidth = availableTypes.length > 0 ? ADD_EFFECT_COLUMN_WIDTH : 0;

  if (list.length === 0) return PREMIXER_EMPTY_WIDTH + addColumnWidth;

  return (
    list.length * FX_BLOCK_WIDTH +
    Math.max(0, list.length - 1) * PREMIXER_EFFECTS_GAP +
    addColumnWidth +
    PREMIXER_EFFECTS_PADDING_X * 2
  );
}
