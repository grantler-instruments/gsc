const STAGE_ROOT_SELECTOR = "[data-gsc-output-stage]";

/** Hidden mirrors for NDI capture — drawImage on a visible playing video flickers in WKWebView. */
const ndiMirrorVideos = new WeakMap<HTMLVideoElement, HTMLVideoElement>();

function rgbaToBgra(rgba: Uint8ClampedArray): Uint8Array {
  const bgra = new Uint8Array(rgba.length);
  for (let i = 0; i < rgba.length; i += 4) {
    bgra[i] = rgba[i + 2] ?? 0;
    bgra[i + 1] = rgba[i + 1] ?? 0;
    bgra[i + 2] = rgba[i] ?? 0;
    bgra[i + 3] = rgba[i + 3] ?? 255;
  }
  return bgra;
}

function syncNdiMirrorVideo(source: HTMLVideoElement): HTMLVideoElement | null {
  if (source.readyState < 2) return null;

  let mirror = ndiMirrorVideos.get(source);
  if (!mirror) {
    mirror = document.createElement("video");
    mirror.muted = true;
    mirror.playsInline = true;
    mirror.preload = "auto";
    mirror.style.cssText =
      "position:fixed;left:-9999px;width:1px;height:1px;opacity:0;pointer-events:none";
    document.body.appendChild(mirror);
    ndiMirrorVideos.set(source, mirror);
  }

  if (mirror.src !== source.src) {
    mirror.src = source.src;
  }

  if (Math.abs(mirror.currentTime - source.currentTime) > 0.05) {
    try {
      mirror.currentTime = source.currentTime;
    } catch {
      return null;
    }
  }

  if (source.paused) {
    if (!mirror.paused) mirror.pause();
  } else if (mirror.paused) {
    void mirror.play().catch(() => {});
  }

  return mirror.readyState >= 2 ? mirror : null;
}

/** Draw the output stage DOM into a canvas and return BGRA pixels. */
export function captureOutputStageFrame(width: number, height: number): Uint8Array | null {
  const stage = document.querySelector(STAGE_ROOT_SELECTOR);
  if (!stage) return null;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { alpha: false });
  if (!ctx) return null;

  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, width, height);

  const stageRect = stage.getBoundingClientRect();
  if (stageRect.width <= 0 || stageRect.height <= 0) return null;

  const scaleX = width / stageRect.width;
  const scaleY = height / stageRect.height;

  const media = stage.querySelectorAll<HTMLVideoElement | HTMLImageElement>("video, img");
  for (const element of media) {
    const rect = element.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) continue;

    const x = (rect.left - stageRect.left) * scaleX;
    const y = (rect.top - stageRect.top) * scaleY;
    const w = rect.width * scaleX;
    const h = rect.height * scaleY;
    const opacity = Number.parseFloat(getComputedStyle(element).opacity);
    if (!Number.isFinite(opacity) || opacity <= 0) continue;

    ctx.globalAlpha = opacity;
    try {
      const captureTarget =
        element instanceof HTMLVideoElement ? syncNdiMirrorVideo(element) : element;
      if (!captureTarget) continue;
      ctx.drawImage(captureTarget, x, y, w, h);
    } catch {
      /* CORS/taint or frame not ready */
    }
  }

  ctx.globalAlpha = 1;
  const imageData = ctx.getImageData(0, 0, width, height);
  return rgbaToBgra(imageData.data);
}
