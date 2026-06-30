function writeAscii(view: DataView, offset: number, text: string): void {
  for (let i = 0; i < text.length; i++) {
    view.setUint8(offset + i, text.charCodeAt(i));
  }
}

/** Merge multiple mono float32 chunks into one buffer. */
export function mergeFloat32Chunks(chunks: Float32Array[]): Float32Array {
  const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const merged = new Float32Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.length;
  }
  return merged;
}

const DEFAULT_AUDIBLE_THRESHOLD = 0.0005;

/** True when the buffer contains non-silent audio. */
export function hasAudibleSamples(
  samples: Float32Array,
  threshold = DEFAULT_AUDIBLE_THRESHOLD,
): boolean {
  for (let i = 0; i < samples.length; i++) {
    if (Math.abs(samples[i]) > threshold) return true;
  }
  return false;
}

/** Encode mono float32 PCM (-1..1) as a 16-bit WAV blob. */
export function encodeWavMono(samples: Float32Array, sampleRate: number): Blob {
  const bitsPerSample = 16;
  const numChannels = 1;
  const bytesPerSample = bitsPerSample / 8;
  const blockAlign = numChannels * bytesPerSample;
  const dataSize = samples.length * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  writeAscii(view, 0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeAscii(view, 8, "WAVE");
  writeAscii(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  writeAscii(view, 36, "data");
  view.setUint32(40, dataSize, true);

  let pcmOffset = 44;
  for (let i = 0; i < samples.length; i++) {
    const clamped = Math.max(-1, Math.min(1, samples[i]));
    const int16 = clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff;
    view.setInt16(pcmOffset, int16, true);
    pcmOffset += 2;
  }

  return new Blob([buffer], { type: "audio/wav" });
}
