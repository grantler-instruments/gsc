/** Number of peak bins stored per waveform (scaled to canvas width when drawing). */
export const WAVEFORM_PEAK_COUNT = 280;

/** Deepest inspector zoom; detail peaks keep ~base resolution per view at this level. */
export const WAVEFORM_MAX_ZOOM = 64;

/** Bins in the zoom-detail peak set. */
export const WAVEFORM_DETAIL_PEAK_COUNT = WAVEFORM_PEAK_COUNT * WAVEFORM_MAX_ZOOM;

/** Frames scanned between yields to the event loop (~a few ms of work). */
const FRAMES_PER_SLICE = 1_000_000;

/** One computation per decoded buffer, shared by every waveform view. */
const peakCache = new WeakMap<AudioBuffer, Promise<Float32Array>>();
const detailPeakCache = new WeakMap<AudioBuffer, Promise<Float32Array>>();

function channelsOf(buffer: AudioBuffer): Float32Array[] {
  const channels: Float32Array[] = [];
  for (let c = 0; c < buffer.numberOfChannels; c++) channels.push(buffer.getChannelData(c));
  return channels;
}

/** Peak of the mono mix over [start, end) without allocating a mixdown buffer. */
function monoPeak(channels: Float32Array[], start: number, end: number): number {
  let max = 0;
  if (channels.length === 1) {
    const ch = channels[0];
    for (let j = start; j < end; j++) {
      const v = Math.abs(ch[j]);
      if (v > max) max = v;
    }
    return max;
  }
  const scale = 1 / channels.length;
  for (let j = start; j < end; j++) {
    let sum = 0;
    for (const ch of channels) sum += ch[j];
    const v = Math.abs(sum * scale);
    if (v > max) max = v;
  }
  return max;
}

/** First frame of bin `i`; fractional bounds so every frame lands in a bin. */
function binStartFrame(i: number, binCount: number, length: number): number {
  return Math.floor((i * length) / binCount);
}

function normalize(peaks: Float32Array): Float32Array {
  let peakMax = 0.0001;
  for (const v of peaks) if (v > peakMax) peakMax = v;
  for (let i = 0; i < peaks.length; i++) peaks[i] /= peakMax;
  return peaks;
}

/** Peak amplitudes per bin (0–1), suitable for symmetric waveform drawing. */
export function computeWaveformPeaks(
  buffer: AudioBuffer,
  binCount = WAVEFORM_PEAK_COUNT,
): Float32Array {
  const channels = channelsOf(buffer);
  const peaks = new Float32Array(binCount);
  for (let i = 0; i < binCount; i++) {
    const start = binStartFrame(i, binCount, buffer.length);
    const end = Math.max(start + 1, binStartFrame(i + 1, binCount, buffer.length));
    peaks[i] = monoPeak(channels, start, Math.min(end, buffer.length));
  }
  return normalize(peaks);
}

function yieldToEventLoop(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

async function computeWaveformPeaksInSlices(
  buffer: AudioBuffer,
  binCount: number,
): Promise<Float32Array> {
  const channels = channelsOf(buffer);
  const peaks = new Float32Array(binCount);
  let framesSinceYield = 0;
  for (let i = 0; i < binCount; i++) {
    const binStart = binStartFrame(i, binCount, buffer.length);
    const binEnd = Math.min(
      Math.max(binStart + 1, binStartFrame(i + 1, binCount, buffer.length)),
      buffer.length,
    );
    let max = 0;
    for (let start = binStart; start < binEnd; start += FRAMES_PER_SLICE) {
      const end = Math.min(start + FRAMES_PER_SLICE, binEnd);
      max = Math.max(max, monoPeak(channels, start, end));
      framesSinceYield += end - start;
      if (framesSinceYield >= FRAMES_PER_SLICE) {
        framesSinceYield = 0;
        await yieldToEventLoop();
      }
    }
    peaks[i] = max;
  }
  return normalize(peaks);
}

/** Waveform peaks computed in slices so long files do not block the UI; cached per buffer. */
export function getWaveformPeaks(buffer: AudioBuffer): Promise<Float32Array> {
  let peaks = peakCache.get(buffer);
  if (!peaks) {
    peaks = computeWaveformPeaksInSlices(buffer, WAVEFORM_PEAK_COUNT);
    peakCache.set(buffer, peaks);
  }
  return peaks;
}

/** High-resolution peaks for zoomed views; computed lazily in slices and cached per buffer. */
export function getWaveformDetailPeaks(buffer: AudioBuffer): Promise<Float32Array> {
  let peaks = detailPeakCache.get(buffer);
  if (!peaks) {
    peaks = computeWaveformPeaksInSlices(buffer, WAVEFORM_DETAIL_PEAK_COUNT);
    detailPeakCache.set(buffer, peaks);
  }
  return peaks;
}
