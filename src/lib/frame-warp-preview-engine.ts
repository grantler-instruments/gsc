/** Lightweight warp preview for the frame placement editor (no postprocessing chain). */

import {
  Mesh,
  OrthographicCamera,
  PlaneGeometry,
  Scene,
  ShaderMaterial,
  SRGBColorSpace,
  Uniform,
  Vector3,
  WebGLRenderer,
  WebGLRenderTarget,
} from "three";
import { visualLayerSx } from "../components/visualStageSx";
import type { OutputLayer } from "../types/output";
import type { VideoOutputFrame } from "../types/video-output-frame";
import { vfsGetObjectUrl } from "../vfs/engine";
import { configureTextureSampling } from "../video/three/layer-material";
import { LayerScene } from "../video/three/layer-scene";
import {
  attachTransportSyncedVideo,
  seekVideoElement,
  type TransportVideoSyncAttachment,
  transportTimingFromOutputLayer,
} from "./transport-synced-video";
import type { CompositorLayer } from "./video-compositor";
import {
  computeVideoOutputFrameWarpMatrices,
  isIdentityVideoOutputFrame,
  normalizeVideoOutputFrame,
} from "./video-output-frame";

const WARP_VERTEX_SHADER = /* glsl */ `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

const WARP_FRAGMENT_SHADER = /* glsl */ `
uniform sampler2D uBuffer;
uniform vec3 uDestToUnit0;
uniform vec3 uDestToUnit1;
uniform vec3 uDestToUnit2;
uniform vec3 uUnitToCrop0;
uniform vec3 uUnitToCrop1;
uniform vec3 uUnitToCrop2;

varying vec2 vUv;

vec2 applyRows(vec3 r0, vec3 r1, vec3 r2, vec2 p) {
  float d = r2.x * p.x + r2.y * p.y + r2.z;
  return vec2(
    (r0.x * p.x + r0.y * p.y + r0.z) / d,
    (r1.x * p.x + r1.y * p.y + r1.z) / d
  );
}

void main() {
  vec2 unit = applyRows(uDestToUnit0, uDestToUnit1, uDestToUnit2, vUv);
  if (unit.x < 0.0 || unit.x > 1.0 || unit.y < 0.0 || unit.y > 1.0) {
    gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
    return;
  }

  vec2 srcUv = applyRows(uUnitToCrop0, uUnitToCrop1, uUnitToCrop2, unit);
  if (srcUv.x < 0.0 || srcUv.x > 1.0 || srcUv.y < 0.0 || srcUv.y > 1.0) {
    gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
    return;
  }

  gl_FragColor = texture2D(uBuffer, srcUv);
}
`;

function layerObjectUrl(layer: OutputLayer): string {
  return layer.objectUrl || vfsGetObjectUrl(layer.assetPath) || "";
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function seekVideo(video: HTMLVideoElement, timeSec: number): void {
  seekVideoElement(video, timeSec);
}

function mediaSourceSize(media: HTMLVideoElement | HTMLImageElement): {
  width: number;
  height: number;
} {
  if (media instanceof HTMLVideoElement) {
    return {
      width: media.videoWidth || 0,
      height: media.videoHeight || 0,
    };
  }
  return {
    width: media.naturalWidth || 0,
    height: media.naturalHeight || 0,
  };
}

function isMediaReady(media: HTMLVideoElement | HTMLImageElement): boolean {
  if (media instanceof HTMLVideoElement) {
    return media.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA;
  }
  return media.complete && media.naturalWidth > 0;
}

interface MediaEntry {
  layer: OutputLayer;
  wrap: HTMLDivElement;
  media: HTMLVideoElement | HTMLImageElement;
  objectUrl: string;
  sync?: TransportVideoSyncAttachment;
}

function rowsFromHomography(matrix: Float32Array): [Vector3, Vector3, Vector3] {
  return [
    new Vector3(matrix[0], matrix[1], matrix[2]),
    new Vector3(matrix[3], matrix[4], matrix[5]),
    new Vector3(matrix[6], matrix[7], matrix[8]),
  ];
}

export class FrameWarpPreviewEngine {
  readonly canvas: HTMLCanvasElement;
  private readonly root: HTMLElement;
  private readonly mediaHost: HTMLDivElement;
  private readonly renderer: WebGLRenderer;
  private readonly layerScene: LayerScene;
  private readonly warpScene = new Scene();
  private readonly warpCamera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private readonly warpMaterial: ShaderMaterial;
  private readonly renderTarget: WebGLRenderTarget;
  private readonly entries = new Map<string, MediaEntry>();
  private width = 0;
  private height = 0;
  private rafId = 0;
  private running = false;
  private outputFrame: VideoOutputFrame = normalizeVideoOutputFrame(undefined);
  private busOpacity = 1;

  constructor(root: HTMLElement) {
    this.root = root;
    this.root.style.position = "relative";
    this.root.style.overflow = "hidden";
    this.root.style.background = "#000";

    this.mediaHost = document.createElement("div");
    this.mediaHost.style.cssText =
      "position:absolute;inset:0;width:100%;height:100%;opacity:0;pointer-events:none;overflow:hidden";
    this.root.appendChild(this.mediaHost);

    this.renderer = new WebGLRenderer({
      alpha: false,
      antialias: false,
      depth: false,
      stencil: false,
      premultipliedAlpha: false,
    });
    this.renderer.outputColorSpace = SRGBColorSpace;
    this.canvas = this.renderer.domElement;
    Object.assign(this.canvas.style, {
      position: "absolute",
      inset: "0",
      width: "100%",
      height: "100%",
      display: "block",
      pointerEvents: "none",
    });
    this.root.appendChild(this.canvas);

    this.layerScene = new LayerScene();
    this.renderTarget = new WebGLRenderTarget(1, 1, { depthBuffer: false, stencilBuffer: false });

    const destToUnitRows = rowsFromHomography(new Float32Array(9));
    const unitToCropRows = rowsFromHomography(new Float32Array(9));
    this.warpMaterial = new ShaderMaterial({
      uniforms: {
        uBuffer: new Uniform(this.renderTarget.texture),
        uDestToUnit0: new Uniform(destToUnitRows[0]),
        uDestToUnit1: new Uniform(destToUnitRows[1]),
        uDestToUnit2: new Uniform(destToUnitRows[2]),
        uUnitToCrop0: new Uniform(unitToCropRows[0]),
        uUnitToCrop1: new Uniform(unitToCropRows[1]),
        uUnitToCrop2: new Uniform(unitToCropRows[2]),
      },
      vertexShader: WARP_VERTEX_SHADER,
      fragmentShader: WARP_FRAGMENT_SHADER,
      depthTest: false,
      depthWrite: false,
    });
    configureTextureSampling(this.renderTarget.texture);

    const warpMesh = new Mesh(new PlaneGeometry(2, 2), this.warpMaterial);
    this.warpScene.add(warpMesh);
    this.warpCamera.position.z = 1;
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
    for (const cueId of [...this.entries.keys()]) {
      this.removeEntry(cueId);
    }
    this.warpMaterial.dispose();
    this.renderTarget.dispose();
    this.layerScene.dispose();
    this.renderer.dispose();
    this.canvas.remove();
    this.mediaHost.remove();
  }

  resize(width: number, height: number): void {
    const nextW = Math.max(1, Math.round(width));
    const nextH = Math.max(1, Math.round(height));
    if (nextW === this.width && nextH === this.height) return;
    this.width = nextW;
    this.height = nextH;
    this.renderer.setSize(nextW, nextH, false);
    this.renderTarget.setSize(nextW, nextH);
    this.layerScene.resize(nextW, nextH);
  }

  syncLayers(layers: OutputLayer[]): void {
    const nextIds = new Set(layers.map((layer) => layer.cueId));
    for (const cueId of [...this.entries.keys()]) {
      if (!nextIds.has(cueId)) {
        this.removeEntry(cueId);
      }
    }
    layers.forEach((layer, index) => {
      this.upsertLayer(layer, index + 1);
    });
    this.syncCompositorLayers();
  }

  setOutputFrame(frame: VideoOutputFrame | undefined): void {
    this.outputFrame = normalizeVideoOutputFrame(frame);
    const { destToUnit, unitToCrop } = computeVideoOutputFrameWarpMatrices(this.outputFrame);
    const destRows = rowsFromHomography(destToUnit);
    const cropRows = rowsFromHomography(unitToCrop);
    (this.warpMaterial.uniforms.uDestToUnit0.value as Vector3).copy(destRows[0]);
    (this.warpMaterial.uniforms.uDestToUnit1.value as Vector3).copy(destRows[1]);
    (this.warpMaterial.uniforms.uDestToUnit2.value as Vector3).copy(destRows[2]);
    (this.warpMaterial.uniforms.uUnitToCrop0.value as Vector3).copy(cropRows[0]);
    (this.warpMaterial.uniforms.uUnitToCrop1.value as Vector3).copy(cropRows[1]);
    (this.warpMaterial.uniforms.uUnitToCrop2.value as Vector3).copy(cropRows[2]);
  }

  setBusOpacity(opacity: number): void {
    this.busOpacity = clamp01(opacity);
  }

  private render(): void {
    if (this.width <= 0 || this.height <= 0) return;

    this.syncCompositorLayers();
    this.layerScene.updateFrame();

    const needsWarp = !isIdentityVideoOutputFrame(this.outputFrame);
    if (!needsWarp) {
      this.renderer.setRenderTarget(null);
      this.renderer.setClearColor(0x000000, 1);
      this.renderer.clear(true, true, true);
      this.renderer.render(this.layerScene.scene, this.layerScene.camera);
      return;
    }

    this.renderer.setRenderTarget(this.renderTarget);
    this.renderer.setClearColor(0x000000, 1);
    this.renderer.clear(true, true, true);
    this.renderer.render(this.layerScene.scene, this.layerScene.camera);

    this.renderer.setRenderTarget(null);
    this.renderer.setClearColor(0x000000, 1);
    this.renderer.clear(true, true, true);
    this.warpMaterial.transparent = this.busOpacity < 1;
    this.warpMaterial.opacity = this.busOpacity;
    this.renderer.render(this.warpScene, this.warpCamera);
  }

  private syncCompositorLayers(): void {
    const compositorLayers: CompositorLayer[] = [];
    for (const entry of this.entries.values()) {
      const { width, height } = mediaSourceSize(entry.media);
      compositorLayers.push({
        id: entry.layer.cueId,
        source: entry.media,
        sourceWidth: width,
        sourceHeight: height,
        opacity: entry.layer.opacity * this.busOpacity,
        zIndex: Number.parseInt(entry.wrap.style.zIndex, 10) || 0,
        ready: isMediaReady(entry.media),
      });
    }
    this.layerScene.syncLayers(compositorLayers);
  }

  private removeEntry(cueId: string): void {
    const entry = this.entries.get(cueId);
    if (!entry) return;
    entry.sync?.detach();
    entry.wrap.remove();
    this.entries.delete(cueId);
  }

  private upsertLayer(layer: OutputLayer, zIndex: number): void {
    const existing = this.entries.get(layer.cueId);
    if (!existing) {
      this.entries.set(layer.cueId, this.createEntry(layer, zIndex));
      return;
    }

    existing.wrap.style.zIndex = String(zIndex);
    existing.layer = { ...existing.layer, opacity: layer.opacity };

    const nextObjectUrl = layerObjectUrl(layer);
    if (existing.objectUrl !== nextObjectUrl && nextObjectUrl) {
      existing.objectUrl = nextObjectUrl;
      existing.media.src = nextObjectUrl;
    }

    if (existing.media instanceof HTMLVideoElement && existing.layer.goAtMs !== layer.goAtMs) {
      existing.layer = { ...existing.layer, goAtMs: layer.goAtMs };
      existing.sync?.resetState();
      seekVideo(existing.media, transportTimingFromOutputLayer(layer).targetTime());
      void existing.media.play().catch(() => {});
    } else {
      existing.layer = { ...existing.layer, ...layer };
    }
  }

  private createEntry(layer: OutputLayer, zIndex: number): MediaEntry {
    const wrap = document.createElement("div");
    wrap.dataset.gscFrameWarpLayer = layer.cueId;
    Object.assign(wrap.style, {
      position: "absolute",
      inset: "0",
      zIndex: String(zIndex),
      opacity: "0",
      pointerEvents: "none",
    });

    const objectUrl = layerObjectUrl(layer);
    let media: HTMLVideoElement | HTMLImageElement;
    let sync: TransportVideoSyncAttachment | undefined;

    const entry: MediaEntry = {
      layer,
      wrap,
      media: null as unknown as HTMLVideoElement,
      objectUrl,
    };

    if (layer.type === "video") {
      const video = document.createElement("video");
      video.muted = true;
      video.playsInline = true;
      video.preload = "auto";
      Object.assign(video.style, {
        ...(visualLayerSx as Record<string, string>),
        backgroundColor: "#000",
        opacity: "0",
      });

      sync = attachTransportSyncedVideo(video, () => transportTimingFromOutputLayer(entry.layer));

      const startPlayback = () => {
        sync?.seekAndPlay();
        this.syncCompositorLayers();
      };

      video.addEventListener("loadedmetadata", startPlayback, { once: true });
      video.addEventListener("loadeddata", () => this.syncCompositorLayers());
      if (objectUrl) video.src = objectUrl;
      if (video.readyState >= 1) startPlayback();
      media = video;
    } else {
      const img = document.createElement("img");
      img.alt = "";
      Object.assign(img.style, visualLayerSx as Record<string, string>);
      img.addEventListener("load", () => this.syncCompositorLayers());
      if (objectUrl) img.src = objectUrl;
      media = img;
    }

    wrap.appendChild(media);
    this.mediaHost.appendChild(wrap);

    entry.media = media;
    entry.sync = sync;
    return entry;
  }
}

export function tryCreateFrameWarpPreviewEngine(root: HTMLElement): FrameWarpPreviewEngine | null {
  try {
    return new FrameWarpPreviewEngine(root);
  } catch (err) {
    console.warn("[frame-warp-preview] WebGL unavailable", err);
    return null;
  }
}
