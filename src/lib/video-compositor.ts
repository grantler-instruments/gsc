/** Three.js + postprocessing compositor for output windows. */

import { EffectComposer, EffectPass, RenderPass } from "postprocessing";
import { SRGBColorSpace, WebGLRenderer } from "three";
import type { VideoEffect } from "../types/video-effect";
import type { VideoOutputFrame } from "../types/video-output-frame";
import {
  applyBusEffectParams,
  type BusEffectRuntime,
  buildBusEffectChain,
  resizeBusEffectRuntimes,
} from "../video/three/effects/build-bus-effects";
import { BusOpacityEffect } from "../video/three/effects/bus-opacity-effect";
import { OutputFrameEffect } from "../video/three/effects/output-frame-effect";
import { LayerScene } from "../video/three/layer-scene";
import { defaultVideoOutputFrame, isIdentityVideoOutputFrame } from "./video-output-frame";

export interface CompositorLayer {
  id: string;
  source: TexImageSource;
  sourceWidth: number;
  sourceHeight: number;
  opacity: number;
  zIndex: number;
  /** False when the source has no drawable frame yet. */
  ready: boolean;
}

/** Full-size but invisible — off-screen 1×1 media is often not decoded by the browser. */
const HIDDEN_MEDIA_STYLE =
  "position:absolute;inset:0;width:100%;height:100%;opacity:0;pointer-events:none;overflow:hidden";

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

/** Maps normalized view UV through CSS object-fit: contain. */
export function objectFitContainUv(
  uv: readonly [number, number],
  texSize: readonly [number, number],
  viewSize: readonly [number, number],
): { uv: [number, number]; visible: boolean } {
  const [u, v] = uv;
  const [texW, texH] = texSize;
  const [viewW, viewH] = viewSize;
  if (texW <= 0 || texH <= 0 || viewW <= 0 || viewH <= 0) {
    return { uv: [u, v], visible: false };
  }

  const texAspect = texW / texH;
  const viewAspect = viewW / viewH;
  let scaleX: number;
  let scaleY: number;
  if (texAspect > viewAspect) {
    scaleX = 1;
    scaleY = viewAspect / texAspect;
  } else {
    scaleX = texAspect / viewAspect;
    scaleY = 1;
  }

  const texU = (u - 0.5) / scaleX + 0.5;
  const texV = (v - 0.5) / scaleY + 0.5;
  const visible = texU >= 0 && texU <= 1 && texV >= 0 && texV <= 1;
  return { uv: [texU, texV], visible };
}

/** Returns null when WebGL is unavailable or context creation fails. */
export function tryCreateVideoCompositor(root: HTMLElement): VideoCompositor | null {
  try {
    return new VideoCompositor(root);
  } catch (err) {
    console.warn("[compositor] WebGL unavailable, falling back to DOM layers", err);
    return null;
  }
}

export class VideoCompositor {
  readonly canvas: HTMLCanvasElement;
  private readonly renderer: WebGLRenderer;
  private readonly layerScene: LayerScene;
  private readonly composer: EffectComposer;
  private readonly renderPass: RenderPass;
  private readonly mediaHost: HTMLDivElement;
  private effectPass: EffectPass | null = null;
  private busOpacityEffect: BusOpacityEffect | null = null;
  private outputFrameEffect: OutputFrameEffect | null = null;
  private effectRuntimes: BusEffectRuntime[] = [];
  private effectChainKey = "";
  private width = 0;
  private height = 0;
  private rafId = 0;
  private layers: CompositorLayer[] = [];
  private busEffects: VideoEffect[] = [];
  private busOpacity = 1;
  private outputFrame: VideoOutputFrame = defaultVideoOutputFrame();
  private running = false;

  constructor(root: HTMLElement) {
    this.mediaHost = document.createElement("div");
    this.mediaHost.style.cssText = HIDDEN_MEDIA_STYLE;
    root.appendChild(this.mediaHost);

    this.renderer = new WebGLRenderer({
      alpha: false,
      antialias: false,
      depth: false,
      stencil: false,
      premultipliedAlpha: false,
    });
    this.renderer.autoClear = false;
    this.renderer.outputColorSpace = SRGBColorSpace;

    this.canvas = this.renderer.domElement;
    this.canvas.dataset.gscCompositor = "";
    Object.assign(this.canvas.style, {
      position: "absolute",
      inset: "0",
      width: "100%",
      height: "100%",
      display: "block",
    });
    root.appendChild(this.canvas);

    this.layerScene = new LayerScene();
    this.composer = new EffectComposer(this.renderer);
    this.renderPass = new RenderPass(this.layerScene.scene, this.layerScene.camera);
    this.renderPass.renderToScreen = true;
    this.composer.addPass(this.renderPass);
  }

  get mediaRoot(): HTMLElement {
    return this.mediaHost;
  }

  setLayers(layers: CompositorLayer[]): void {
    this.layers = [...layers].sort((a, b) => a.zIndex - b.zIndex);
  }

  setBusEffects(effects: VideoEffect[]): void {
    this.busEffects = effects;
    this.syncEffectPass();
  }

  setBusOpacity(opacity: number): void {
    this.busOpacity = clamp01(opacity);
    if (this.busOpacityEffect) {
      this.busOpacityEffect.opacity = this.busOpacity;
    }
    this.syncEffectPass();
  }

  setOutputFrame(frame: VideoOutputFrame): void {
    this.outputFrame = frame;
    this.outputFrameEffect?.apply(frame);
    this.syncEffectPass();
  }

  resize(width: number, height: number): void {
    const nextW = Math.max(1, Math.round(width));
    const nextH = Math.max(1, Math.round(height));
    if (nextW === this.width && nextH === this.height) return;
    this.width = nextW;
    this.height = nextH;
    this.renderer.setSize(nextW, nextH, false);
    this.composer.setSize(nextW, nextH, false);
    this.layerScene.resize(nextW, nextH);
    resizeBusEffectRuntimes(this.effectRuntimes, nextW, nextH);
    this.syncEffectPass();
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    const tick = () => {
      this.rafId = requestAnimationFrame(tick);
      this.render();
    };
    this.rafId = requestAnimationFrame(tick);
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.rafId);
    this.rafId = 0;
  }

  destroy(): void {
    this.stop();
    this.removeEffectPass();
    this.layerScene.dispose();
    this.composer.dispose();
    this.renderer.dispose();
    this.canvas.remove();
    this.mediaHost.remove();
  }

  private render(): void {
    if (this.width <= 0 || this.height <= 0) return;

    const drawable = this.layers.filter((layer) => layer.ready && layer.opacity > 0);
    this.layerScene.syncLayers(drawable);

    if (drawable.length === 0) {
      this.renderer.setRenderTarget(null);
      this.renderer.setClearColor(0x000000, 1);
      this.renderer.clear(true, true, true);
      return;
    }

    this.layerScene.updateFrame();
    this.composer.render();
  }

  private syncEffectPass(): void {
    if (this.width <= 0 || this.height <= 0) return;

    const enabledEffects = this.busEffects.filter((effect) => effect.enabled);
    const needsFrame = !isIdentityVideoOutputFrame(this.outputFrame);
    const needsPass = enabledEffects.length > 0 || this.busOpacity < 1 || needsFrame;

    if (!needsPass) {
      this.removeEffectPass();
      this.renderPass.renderToScreen = true;
      return;
    }

    this.renderPass.renderToScreen = false;

    const chainKey = buildBusEffectChain(enabledEffects, this.width, this.height).key;
    const needsRebuild =
      !this.effectPass || chainKey !== this.effectChainKey || !this.outputFrameEffect;
    if (needsRebuild) {
      this.removeEffectPass();
      const chain = buildBusEffectChain(enabledEffects, this.width, this.height);
      this.effectChainKey = chain.key;
      this.effectRuntimes = chain.runtimes;

      const passEffects = [...chain.effects];
      this.outputFrameEffect = new OutputFrameEffect(this.outputFrame);
      passEffects.push(this.outputFrameEffect);
      this.busOpacityEffect = new BusOpacityEffect(this.busOpacity);
      passEffects.push(this.busOpacityEffect);

      this.effectPass = new EffectPass(this.layerScene.camera, ...passEffects);
      this.effectPass.renderToScreen = true;
      this.composer.addPass(this.effectPass);
      this.renderPass.renderToScreen = false;
      applyBusEffectParams(enabledEffects, this.effectRuntimes);
      return;
    }

    applyBusEffectParams(enabledEffects, this.effectRuntimes);
    this.outputFrameEffect?.apply(this.outputFrame);
    if (this.busOpacityEffect) {
      this.busOpacityEffect.opacity = this.busOpacity;
    }
  }

  private removeEffectPass(): void {
    if (!this.effectPass) return;
    this.composer.removePass(this.effectPass);
    this.effectPass.dispose();
    this.effectPass = null;
    this.busOpacityEffect = null;
    this.outputFrameEffect = null;
    this.effectRuntimes = [];
    this.effectChainKey = "";
  }
}
