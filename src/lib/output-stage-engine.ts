import { visualLayerSx } from "../components/visualStageSx";
import type { OutputLayer } from "../types/output";
import type { OutputBusConfig, OutputStageHandle } from "./output-stage-registry";
import {
  type CompositorLayer,
  tryCreateVideoCompositor,
  type VideoCompositor,
} from "./video-compositor";
import { isOutputLayerLooping, outputLayerTargetTime, sliceEndSec } from "./video-playback";

export interface OutputStageEngineOptions {
  /** Control preview — notify when a non-looping clip finishes. */
  onVideoEnded?: (cueId: string) => void;
  /** When false, stack visible DOM layers instead of the WebGL compositor. */
  useCompositor?: boolean;
}

interface LayerEntry {
  layer: OutputLayer;
  wrap: HTMLDivElement;
  media: HTMLVideoElement | HTMLImageElement;
  objectUrl: string;
  loopTimerId: number;
  loopIterations: number;
  goAtMs: number;
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function seekVideo(video: HTMLVideoElement, timeSec: number): void {
  const target = Math.max(0, timeSec);
  if (typeof video.fastSeek === "function") {
    try {
      video.fastSeek(target);
      return;
    } catch {
      /* fall through */
    }
  }
  try {
    video.currentTime = target;
  } catch {
    /* seek not ready */
  }
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

/** Imperative compositor for the output webview — avoids React video remounts. */
export class OutputStageEngine implements OutputStageHandle {
  private readonly root: HTMLElement;
  private readonly compositor: VideoCompositor | null;
  private readonly entries = new Map<string, LayerEntry>();
  private readonly onVideoEnded?: (cueId: string) => void;
  private resizeObserver: ResizeObserver | null = null;

  constructor(root: HTMLElement, options: OutputStageEngineOptions = {}) {
    this.root = root;
    this.onVideoEnded = options.onVideoEnded;
    this.root.style.position = "relative";
    this.root.style.width = "100%";
    this.root.style.height = "100%";
    this.root.style.background = "#000";
    this.root.style.overflow = "hidden";

    this.compositor = options.useCompositor === false ? null : tryCreateVideoCompositor(this.root);
    if (this.compositor) {
      this.compositor.start();
      this.syncCompositorSize();
      this.resizeObserver = new ResizeObserver(() => {
        this.syncCompositorSize();
      });
      this.resizeObserver.observe(this.root);
    }
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

  setOpacities(layers: OutputLayer[]): void {
    for (const layer of layers) {
      const entry = this.entries.get(layer.cueId);
      if (!entry) continue;
      entry.layer = { ...entry.layer, opacity: layer.opacity };
      if (!this.compositor) {
        entry.wrap.style.opacity = String(clamp01(layer.opacity));
      }
    }
    this.syncCompositorLayers();
  }

  syncBusConfig(config: OutputBusConfig): void {
    if (!this.compositor) return;
    this.compositor.setBusEffects(config.effects);
    this.compositor.setBusOpacity(config.opacity);
    this.compositor.setOutputFrame(config.outputFrame);
  }

  destroy(): void {
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    for (const cueId of [...this.entries.keys()]) {
      this.removeEntry(cueId);
    }
    this.compositor?.destroy();
    this.root.replaceChildren();
  }

  private layerHost(): HTMLElement {
    return this.compositor?.mediaRoot ?? this.root;
  }

  private syncCompositorSize(): void {
    if (!this.compositor) return;
    const rect = this.root.getBoundingClientRect();
    this.compositor.resize(rect.width, rect.height);
  }

  private syncCompositorLayers(): void {
    if (!this.compositor) return;

    const compositorLayers: CompositorLayer[] = [];
    for (const entry of this.entries.values()) {
      const { width, height } = mediaSourceSize(entry.media);
      compositorLayers.push({
        id: entry.layer.cueId,
        source: entry.media,
        sourceWidth: width,
        sourceHeight: height,
        opacity: entry.layer.opacity,
        zIndex: Number.parseInt(entry.wrap.style.zIndex, 10) || 0,
        ready: isMediaReady(entry.media),
      });
    }

    this.compositor.setLayers(compositorLayers);
  }

  private removeEntry(cueId: string): void {
    const entry = this.entries.get(cueId);
    if (!entry) return;
    window.clearTimeout(entry.loopTimerId);
    entry.wrap.remove();
    this.entries.delete(cueId);
    this.syncCompositorLayers();
  }

  private upsertLayer(layer: OutputLayer, zIndex: number): void {
    const existing = this.entries.get(layer.cueId);

    if (!existing) {
      const entry = this.createEntry(layer, zIndex);
      this.entries.set(layer.cueId, entry);
      this.syncCompositorLayers();
      return;
    }

    existing.wrap.style.zIndex = String(zIndex);
    existing.layer = { ...existing.layer, opacity: layer.opacity };
    if (!this.compositor) {
      existing.wrap.style.opacity = String(clamp01(layer.opacity));
    }

    if (existing.layer.inTime !== layer.inTime || existing.layer.sliceSec !== layer.sliceSec) {
      existing.layer = { ...existing.layer, ...layer };
      if (existing.media instanceof HTMLVideoElement) {
        this.scheduleLoopWrap(existing);
      }
    } else {
      existing.layer = { ...existing.layer, ...layer };
    }

    if (existing.objectUrl !== layer.objectUrl) {
      existing.objectUrl = layer.objectUrl;
      if (existing.media instanceof HTMLVideoElement) {
        existing.media.src = layer.objectUrl;
      } else {
        existing.media.src = layer.objectUrl;
      }
    }

    if (existing.media instanceof HTMLVideoElement && existing.goAtMs !== layer.goAtMs) {
      existing.goAtMs = layer.goAtMs;
      existing.loopIterations = 0;
      seekVideo(existing.media, outputLayerTargetTime(layer));
      void existing.media.play().catch(() => {});
      this.scheduleLoopWrap(existing);
    }

    this.syncCompositorLayers();
  }

  private createEntry(layer: OutputLayer, zIndex: number): LayerEntry {
    const wrap = document.createElement("div");
    wrap.dataset.gscOutputLayer = layer.cueId;
    Object.assign(wrap.style, {
      position: "absolute",
      inset: "0",
      zIndex: String(zIndex),
      opacity: this.compositor ? "0" : String(clamp01(layer.opacity)),
      pointerEvents: "none",
    });

    let media: HTMLVideoElement | HTMLImageElement;
    if (layer.type === "video") {
      const video = document.createElement("video");
      video.muted = true;
      video.playsInline = true;
      video.preload = "auto";
      Object.assign(video.style, {
        ...(visualLayerSx as Record<string, string>),
        backgroundColor: "#000",
      });
      if (this.compositor) {
        video.style.opacity = "0";
      }

      const startPlayback = () => {
        seekVideo(video, outputLayerTargetTime(layer));
        void video.play().catch(() => {});
        const entry = this.entries.get(layer.cueId);
        if (entry) this.scheduleLoopWrap(entry);
        this.syncCompositorLayers();
      };

      video.addEventListener("loadedmetadata", startPlayback, { once: true });
      video.addEventListener("loadeddata", () => this.syncCompositorLayers());
      video.addEventListener("error", () => {
        console.warn("[output] Could not load", layer.objectUrl);
      });
      if (this.onVideoEnded) {
        video.addEventListener("ended", () => {
          this.handleVideoEnded(layer.cueId);
        });
      }
      video.src = layer.objectUrl;
      if (video.readyState >= 1) startPlayback();
      media = video;
    } else {
      const img = document.createElement("img");
      img.alt = "";
      Object.assign(img.style, visualLayerSx as Record<string, string>);
      if (this.compositor) {
        img.style.opacity = "0";
      }
      img.addEventListener("load", () => this.syncCompositorLayers());
      img.addEventListener("error", () => {
        console.warn("[output] Could not load", layer.objectUrl);
      });
      img.src = layer.objectUrl;
      media = img;
    }

    wrap.appendChild(media);
    this.layerHost().appendChild(wrap);

    return {
      layer,
      wrap,
      media,
      objectUrl: layer.objectUrl,
      loopTimerId: 0,
      loopIterations: 0,
      goAtMs: layer.goAtMs,
    };
  }

  private handleVideoEnded(cueId: string): void {
    const entry = this.entries.get(cueId);
    if (!entry || !(entry.media instanceof HTMLVideoElement)) return;

    const current = entry.layer;
    if (current.loopCount === "inf") {
      seekVideo(entry.media, outputLayerTargetTime(current));
      void entry.media.play().catch(() => {});
      return;
    }

    if (!isOutputLayerLooping(current)) {
      this.onVideoEnded?.(cueId);
      return;
    }

    entry.loopIterations += 1;
    if (entry.loopIterations >= (current.loopCount as number)) {
      this.onVideoEnded?.(cueId);
      return;
    }

    seekVideo(entry.media, current.inTime);
    void entry.media.play().catch(() => {});
    this.scheduleLoopWrap(entry);
  }

  private scheduleLoopWrap(entry: LayerEntry): void {
    window.clearTimeout(entry.loopTimerId);
    entry.loopTimerId = 0;

    const video = entry.media;
    if (!(video instanceof HTMLVideoElement)) return;
    if (!isOutputLayerLooping(entry.layer)) return;
    if (!Number.isFinite(video.duration)) return;

    const endSec = sliceEndSec(entry.layer.inTime, entry.layer.sliceSec);
    const delayMs = Math.max(16, (endSec - video.currentTime) * 1000);

    entry.loopTimerId = window.setTimeout(() => {
      entry.loopTimerId = 0;
      const current = entry.layer;
      if (!isOutputLayerLooping(current)) return;

      if (current.loopCount !== "inf") {
        const next = entry.loopIterations + 1;
        if (next >= (current.loopCount as number)) {
          video.pause();
          this.onVideoEnded?.(current.cueId);
          return;
        }
        entry.loopIterations = next;
      }

      seekVideo(video, current.inTime);
      void video.play().catch(() => {});
      this.scheduleLoopWrap(entry);
    }, delayMs);
  }
}
