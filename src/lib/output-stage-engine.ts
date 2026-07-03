import { visualLayerSx } from "../components/visualStageSx";
import type { OutputLayer } from "../types/output";
import { isOutputLayerLooping, outputLayerTargetTime, sliceEndSec } from "./video-playback";

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

/** Imperative compositor for the Tauri output webview — avoids React video remounts. */
export class OutputStageEngine {
  private readonly root: HTMLElement;
  private readonly entries = new Map<string, LayerEntry>();

  constructor(root: HTMLElement) {
    this.root = root;
    this.root.style.position = "relative";
    this.root.style.width = "100%";
    this.root.style.height = "100%";
    this.root.style.background = "#000";
    this.root.style.overflow = "hidden";
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
  }

  destroy(): void {
    for (const cueId of [...this.entries.keys()]) {
      this.removeEntry(cueId);
    }
    this.root.replaceChildren();
  }

  private removeEntry(cueId: string): void {
    const entry = this.entries.get(cueId);
    if (!entry) return;
    window.clearTimeout(entry.loopTimerId);
    entry.wrap.remove();
    this.entries.delete(cueId);
  }

  private upsertLayer(layer: OutputLayer, zIndex: number): void {
    const existing = this.entries.get(layer.cueId);

    if (!existing) {
      const entry = this.createEntry(layer, zIndex);
      this.entries.set(layer.cueId, entry);
      return;
    }

    existing.wrap.style.zIndex = String(zIndex);
    existing.wrap.style.opacity = String(clamp01(layer.opacity));

    if (existing.layer.inTime !== layer.inTime || existing.layer.sliceSec !== layer.sliceSec) {
      existing.layer = layer;
      if (existing.media instanceof HTMLVideoElement) {
        this.scheduleLoopWrap(existing);
      }
    } else {
      existing.layer = layer;
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
  }

  private createEntry(layer: OutputLayer, zIndex: number): LayerEntry {
    const wrap = document.createElement("div");
    wrap.dataset.gscOutputLayer = layer.cueId;
    Object.assign(wrap.style, {
      position: "absolute",
      inset: "0",
      zIndex: String(zIndex),
      opacity: String(clamp01(layer.opacity)),
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

      const startPlayback = () => {
        seekVideo(video, outputLayerTargetTime(layer));
        void video.play().catch(() => {});
        const entry = this.entries.get(layer.cueId);
        if (entry) this.scheduleLoopWrap(entry);
      };

      video.addEventListener("loadedmetadata", startPlayback, { once: true });
      video.addEventListener("error", () => {
        console.warn("[output] Could not load", layer.objectUrl);
      });
      video.src = layer.objectUrl;
      if (video.readyState >= 1) startPlayback();
      media = video;
    } else {
      const img = document.createElement("img");
      img.alt = "";
      Object.assign(img.style, visualLayerSx as Record<string, string>);
      img.src = layer.objectUrl;
      media = img;
    }

    wrap.appendChild(media);
    this.root.appendChild(wrap);

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
