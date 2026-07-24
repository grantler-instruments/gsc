import type { Effect } from "postprocessing";
import { videoEffectChainKey } from "../../../lib/video-effects";
import type { VideoEffect } from "../../../types/video-effect";
import { BloomEffect } from "./bloom-effect";
import { BlurEffect } from "./blur-effect";
import { ChromaticAberrationEffect } from "./chromatic-aberration-effect";
import { ColorGradeEffect } from "./color-grade-effect";
import { DotScreenEffect } from "./dot-screen-effect";
import { HueSaturationEffect } from "./hue-saturation-effect";
import { NoiseEffect } from "./noise-effect";
import { PixelationEffect } from "./pixelation-effect";
import { ScanlineEffect } from "./scanline-effect";
import { SepiaEffect } from "./sepia-effect";
import { VignetteEffect } from "./vignette-effect";

export interface BusEffectChain {
  key: string;
  effects: Effect[];
  runtimes: BusEffectRuntime[];
}

export interface BusEffectRuntime {
  id: string;
  apply(effect: VideoEffect): void;
  resize?(width: number, height: number): void;
}

export function buildBusEffectChain(
  effects: VideoEffect[],
  width: number,
  height: number,
): { key: string; effects: Effect[]; runtimes: BusEffectRuntime[] } {
  const built: Effect[] = [];
  const runtimes: BusEffectRuntime[] = [];

  for (const effect of effects) {
    switch (effect.type) {
      case "colorGrade": {
        const runtime = new ColorGradeEffect(effect);
        runtime.apply(effect);
        built.push(runtime);
        runtimes.push({
          id: effect.id,
          apply: (next) => {
            if (next.type === "colorGrade") runtime.apply(next);
          },
        });
        break;
      }
      case "blur": {
        const runtime = new BlurEffect(effect, width, height);
        runtime.apply(effect);
        built.push(runtime);
        runtimes.push({
          id: effect.id,
          apply: (next) => {
            if (next.type === "blur") runtime.apply(next);
          },
          resize: (nextW, nextH) => runtime.resize(nextW, nextH),
        });
        break;
      }
      case "vignette": {
        const runtime = new VignetteEffect(effect);
        runtime.apply(effect);
        built.push(runtime);
        runtimes.push({
          id: effect.id,
          apply: (next) => {
            if (next.type === "vignette") runtime.apply(next);
          },
        });
        break;
      }
      case "bloom": {
        const runtime = new BloomEffect(effect);
        runtime.apply(effect);
        built.push(runtime);
        runtimes.push({
          id: effect.id,
          apply: (next) => {
            if (next.type === "bloom") runtime.apply(next);
          },
        });
        break;
      }
      case "noise": {
        const runtime = new NoiseEffect(effect);
        runtime.apply(effect);
        built.push(runtime);
        runtimes.push({
          id: effect.id,
          apply: (next) => {
            if (next.type === "noise") runtime.apply(next);
          },
        });
        break;
      }
      case "sepia": {
        const runtime = new SepiaEffect(effect);
        runtime.apply(effect);
        built.push(runtime);
        runtimes.push({
          id: effect.id,
          apply: (next) => {
            if (next.type === "sepia") runtime.apply(next);
          },
        });
        break;
      }
      case "chromaticAberration": {
        const runtime = new ChromaticAberrationEffect(effect);
        runtime.apply(effect);
        built.push(runtime);
        runtimes.push({
          id: effect.id,
          apply: (next) => {
            if (next.type === "chromaticAberration") runtime.apply(next);
          },
        });
        break;
      }
      case "hueSaturation": {
        const runtime = new HueSaturationEffect(effect);
        runtime.apply(effect);
        built.push(runtime);
        runtimes.push({
          id: effect.id,
          apply: (next) => {
            if (next.type === "hueSaturation") runtime.apply(next);
          },
        });
        break;
      }
      case "pixelation": {
        const runtime = new PixelationEffect(effect, width, height);
        runtime.apply(effect);
        built.push(runtime);
        runtimes.push({
          id: effect.id,
          apply: (next) => {
            if (next.type === "pixelation") runtime.apply(next);
          },
          resize: (nextW, nextH) => runtime.resize(nextW, nextH),
        });
        break;
      }
      case "scanline": {
        const runtime = new ScanlineEffect(effect, width, height);
        runtime.apply(effect);
        built.push(runtime);
        runtimes.push({
          id: effect.id,
          apply: (next) => {
            if (next.type === "scanline") runtime.apply(next);
          },
          resize: (nextW, nextH) => runtime.resize(nextW, nextH),
        });
        break;
      }
      case "dotScreen": {
        const runtime = new DotScreenEffect(effect);
        runtime.apply(effect);
        built.push(runtime);
        runtimes.push({
          id: effect.id,
          apply: (next) => {
            if (next.type === "dotScreen") runtime.apply(next);
          },
        });
        break;
      }
    }
  }

  return {
    key: videoEffectChainKey(effects),
    effects: built,
    runtimes,
  };
}

export function applyBusEffectParams(effects: VideoEffect[], runtimes: BusEffectRuntime[]): void {
  for (let index = 0; index < runtimes.length; index += 1) {
    const effect = effects[index];
    const runtime = runtimes[index];
    if (effect && runtime) runtime.apply(effect);
  }
}

export function resizeBusEffectRuntimes(
  runtimes: BusEffectRuntime[],
  width: number,
  height: number,
): void {
  for (const runtime of runtimes) {
    runtime.resize?.(width, height);
  }
}
