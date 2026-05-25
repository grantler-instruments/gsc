const STAGE_ROOT_SELECTOR = "[data-gsc-output-stage]";

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

/** Draw the output stage DOM into a canvas and return BGRA pixels. */
export function captureOutputStageFrame(
  width: number,
  height: number,
): Uint8Array | null {
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
      ctx.drawImage(element, x, y, w, h);
    } catch {
      /* CORS/taint or frame not ready */
    }
  }

  ctx.globalAlpha = 1;
  const imageData = ctx.getImageData(0, 0, width, height);
  return rgbaToBgra(imageData.data);
}
