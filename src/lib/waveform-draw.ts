/** Compact symmetric waveform for small transport thumbnails. */
export function drawCompactWaveform(
  canvas: HTMLCanvasElement,
  peaks: Float32Array,
  height: number,
  waveColor: string,
  trackColor: string,
): void {
  const dpr = window.devicePixelRatio || 1;
  const width = canvas.clientWidth;
  if (width <= 0 || height <= 0) return;

  canvas.width = Math.floor(width * dpr);
  canvas.height = Math.floor(height * dpr);

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = trackColor;
  ctx.fillRect(0, 0, width, height);

  const mid = height / 2;
  ctx.fillStyle = waveColor;
  const barW = Math.max(1, width / peaks.length);
  for (let i = 0; i < peaks.length; i++) {
    const x = (i / peaks.length) * width;
    const amp = peaks[i] * (height / 2 - 1);
    ctx.fillRect(x, mid - amp, barW, amp * 2);
  }
}

export function readCompactWaveformColors(canvas: HTMLCanvasElement): {
  track: string;
  wave: string;
} {
  const root = canvas.closest(".gsc-theme-root") ?? document.documentElement;
  const styles = getComputedStyle(root);
  return {
    track: styles.getPropertyValue("--bg-hover").trim() || "rgba(128,128,128,0.25)",
    wave: styles.getPropertyValue("--success").trim() || "#4caf50",
  };
}
