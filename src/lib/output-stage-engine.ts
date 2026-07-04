import { visualLayerSx } from "../components/visualStageSx";
import type { OutputLayer } from "../types/output";
import { vfsGetObjectUrl } from "../vfs/engine";
import { clamp01 } from "./clamp";
import type { OutputBusConfig, OutputStageHandle } from "./output-stage-registry";
import {
  attachTransportSyncedVideo,
  seekVideoElement,
  type TransportVideoSyncAttachment,
  transportTimingFromOutputLayer,
} from "./transport-synced-video";
import {
  type CompositorLayer,
  tryCreateVideoCompositor,
  type VideoCompositor,
} from "./video-compositor";
import { outputLayerTargetTime } from "./video-playback";

function layerObjectUrl(layer: OutputLayer): string {
  return layer.objectUrl || vfsGetObjectUrl(layer.assetPath) || "";
}

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
  sync?: TransportVideoSyncAttachment;
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
      requestAnimationFrame(() => {
        this.syncCompositorSize();
      });
    }
  }

  /** Re-measure host size after layout (embedded previews). */
  syncLayout(): void {
    this.syncCompositorSize();
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
      } else {
        entry.wrap.style.opacity = "0";
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
    entry.sync?.detach();
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
      existing.sync?.resetState();
    } else {
      existing.layer = { ...existing.layer, ...layer };
    }

    const nextObjectUrl = layerObjectUrl(layer);
    if (existing.objectUrl !== nextObjectUrl) {
      existing.objectUrl = nextObjectUrl;
      existing.media.src = existing.objectUrl;
    }

    if (existing.media instanceof HTMLVideoElement && existing.layer.goAtMs !== layer.goAtMs) {
      existing.layer = { ...existing.layer, goAtMs: layer.goAtMs };
      existing.sync?.resetState();
      seekVideoElement(existing.media, outputLayerTargetTime(layer));
      void existing.media.play().catch(() => {});
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
    let sync: TransportVideoSyncAttachment | undefined;

    const entry: LayerEntry = {
      layer,
      wrap,
      media: null as unknown as HTMLVideoElement,
      objectUrl: layerObjectUrl(layer),
    };

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

      sync = attachTransportSyncedVideo(video, () => transportTimingFromOutputLayer(entry.layer), {
        onEnded: this.onVideoEnded ? () => this.onVideoEnded?.(entry.layer.cueId) : undefined,
      });

      const startPlayback = () => {
        sync?.seekAndPlay();
        this.syncCompositorLayers();
      };

      video.addEventListener("loadedmetadata", startPlayback, { once: true });
      video.addEventListener("loadeddata", () => this.syncCompositorLayers());
      video.addEventListener("error", () => {
        console.warn("[output] Could not load", layer.objectUrl);
      });
      video.src = entry.objectUrl;
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
      img.src = entry.objectUrl;
      media = img;
    }

    entry.media = media;
    entry.sync = sync;

    wrap.appendChild(media);
    this.layerHost().appendChild(wrap);

    return entry;
  }
}
