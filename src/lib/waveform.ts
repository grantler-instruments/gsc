/** Number of peak bins stored per waveform (scaled to canvas width when drawing). */
export const WAVEFORM_PEAK_COUNT = 280;

export function mixDownToMono(buffer: AudioBuffer): Float32Array {
  if (buffer.numberOfChannels === 1) {
    return buffer.getChannelData(0);
  }
  const { length, numberOfChannels } = buffer;
  const mono = new Float32Array(length);
  for (let c = 0; c < numberOfChannels; c++) {
    const ch = buffer.getChannelData(c);
    for (let i = 0; i < length; i++) {
      mono[i] += ch[i];
    }
  }
  const scale = 1 / numberOfChannels;
  for (let i = 0; i < length; i++) {
    mono[i] *= scale;
  }
  return mono;
}

/** Peak amplitudes per bin (0–1), suitable for symmetric waveform drawing. */
export function computeWaveformPeaks(
  buffer: AudioBuffer,
  binCount = WAVEFORM_PEAK_COUNT,
): Float32Array {
  const samples = mixDownToMono(buffer);
  const peaks = new Float32Array(binCount);
  const blockSize = Math.max(1, Math.floor(samples.length / binCount));

  for (let i = 0; i < binCount; i++) {
    const start = i * blockSize;
    const end = Math.min(start + blockSize, samples.length);
    let max = 0;
    for (let j = start; j < end; j++) {
      const v = Math.abs(samples[j]);
      if (v > max) max = v;
    }
    peaks[i] = max;
  }

  const peakMax = Math.max(...peaks, 0.0001);
  for (let i = 0; i < binCount; i++) {
    peaks[i] /= peakMax;
  }

  return peaks;
}
