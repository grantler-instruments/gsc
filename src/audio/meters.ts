/** Read-only, stereo taps. Meter data never enters project state or undo history. */
export interface MeterReading {
  db: readonly [number, number];
  peakDb: readonly [number, number];
  clipped: boolean;
}

export const SILENT_METER: MeterReading = { db: [-60, -60], peakDb: [-60, -60], clipped: false };
export const cueMeterId = (id: string) => `cue:${id}`;
export const busMeterId = (id: string) => `bus:${id}`;
export const MASTER_METER_ID = "master";

export function samplePeakDb(samples: Float32Array): number {
  let peak = 0;
  for (const sample of samples) peak = Math.max(peak, Math.abs(sample));
  return Math.max(-60, 20 * Math.log10(peak));
}

interface Tap {
  ctx: AudioContext;
  source: AudioNode;
  splitter: ChannelSplitterNode;
  analysers: AnalyserNode[];
  samples: Float32Array<ArrayBuffer>;
  reading: MeterReading;
  heldUntil: number[];
  clippedUntil: number;
  lastRead: number;
}

export class AudioMeters {
  private taps = new Map<string, Tap>();
  private listeners = new Map<string, Set<() => void>>();
  private frame: number | undefined;
  private lastFrame = 0;

  attach(id: string, ctx: AudioContext, source: AudioNode): void {
    const existing = this.taps.get(id);
    if (existing?.source === source) {
      // Routing reconciliation may have disconnected every output on this source.
      source.connect(existing.splitter);
      return;
    }
    this.remove(id);
    const splitter = ctx.createChannelSplitter(2);
    const analysers = [ctx.createAnalyser(), ctx.createAnalyser()];
    // Cover at least one 30 Hz display interval, including higher sample rates.
    const size = Math.min(32768, Math.max(2048, 2 ** Math.ceil(Math.log2(ctx.sampleRate / 30))));
    analysers.forEach((analyser, channel) => {
      analyser.fftSize = size;
      splitter.connect(analyser, channel);
    });
    source.connect(splitter);
    this.taps.set(id, {
      ctx,
      source,
      splitter,
      analysers,
      samples: new Float32Array(size),
      reading: SILENT_METER,
      heldUntil: [0, 0],
      clippedUntil: 0,
      lastRead: 0,
    });
  }

  remove(id: string): void {
    const tap = this.taps.get(id);
    if (!tap) return;
    try {
      tap.source.disconnect(tap.splitter);
    } catch {
      /* Already disconnected by routing. */
    }
    tap.splitter.disconnect();
    for (const analyser of tap.analysers) analyser.disconnect();
    this.taps.delete(id);
    this.notify(id);
  }

  getReading = (id: string): MeterReading => this.taps.get(id)?.reading ?? SILENT_METER;

  subscribe(id: string, listener: () => void): () => void {
    let listeners = this.listeners.get(id);
    if (!listeners) {
      listeners = new Set();
      this.listeners.set(id, listeners);
    }
    listeners.add(listener);
    if (this.frame === undefined) this.frame = requestAnimationFrame(this.tick);
    return () => {
      listeners.delete(listener);
      if (!listeners.size) this.listeners.delete(id);
      if (!this.listeners.size && this.frame !== undefined) {
        cancelAnimationFrame(this.frame);
        this.frame = undefined;
      }
    };
  }

  private notify(id: string): void {
    for (const listener of this.listeners.get(id) ?? []) listener();
  }

  /** One shared display clock; only read taps with visible subscribers. */
  private tick = (now: number): void => {
    if (now - this.lastFrame >= 1000 / 30) {
      this.lastFrame = now;
      for (const id of this.listeners.keys()) this.sample(id, now);
    }
    this.frame = this.listeners.size ? requestAnimationFrame(this.tick) : undefined;
  };

  sample(id: string, now: number): void {
    const tap = this.taps.get(id);
    if (!tap) return;
    const elapsed = Math.max(0, (now - tap.lastRead) / 1000);
    tap.lastRead = now;
    const db: [number, number] = [-60, -60];
    const peakDb: [number, number] = [-60, -60];
    tap.analysers.forEach((analyser, channel) => {
      analyser.getFloatTimeDomainData(tap.samples);
      const raw = tap.ctx.state === "running" ? samplePeakDb(tap.samples) : -60;
      db[channel] = Math.max(raw, tap.reading.db[channel] - elapsed * 36);
      if (raw >= tap.reading.peakDb[channel]) tap.heldUntil[channel] = now + 1000;
      peakDb[channel] = Math.max(
        raw,
        tap.reading.peakDb[channel] - (now > tap.heldUntil[channel] ? elapsed * 18 : 0),
      );
      if (raw >= 0) tap.clippedUntil = now + 2000;
    });
    const clipped = tap.clippedUntil > now;
    const previous = tap.reading;
    if (
      db.every((v, i) => v === previous.db[i]) &&
      peakDb.every((v, i) => v === previous.peakDb[i]) &&
      clipped === previous.clipped
    )
      return;
    tap.reading = { db, peakDb, clipped };
    this.notify(id);
  }
}

export const audioMeters = new AudioMeters();
