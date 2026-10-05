import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { openAudioInputStream } from "../lib/audio-input";
import { resolveAssetBlob } from "../platform/vfs-asset";
import type { Cue } from "../types/cue";
import { getCachedAudioBuffer, preloadAudioBuffer } from "./buffer-cache";
import { AudioEngine } from "./engine";
import { audioMeters, cueMeterId, SILENT_METER } from "./meters";
import { createMockAudioContext, createMockAudioNode } from "./test/mock-audio-context";
import {
  scheduleVideoVoiceEnvelope,
  startVideoVoice,
  stopVideoVoice,
  type VideoVoice,
} from "./video-voice";

vi.mock("../lib/audio-input", () => ({ openAudioInputStream: vi.fn() }));
vi.mock("./effects/worklet", () => ({ prepareBusEffects: vi.fn(async () => {}) }));
vi.mock("../platform/vfs-asset", () => ({ resolveAssetBlob: vi.fn() }));
vi.mock("./video-voice", () => ({
  scheduleVideoVoiceEnvelope: vi.fn(),
  seekVideoVoice: vi.fn(),
  startVideoVoice: vi.fn(),
  stopVideoVoice: vi.fn(),
  updateVideoVoiceLevels: vi.fn(),
}));
vi.mock("./buffer-cache", () => ({ getCachedAudioBuffer: vi.fn(), preloadAudioBuffer: vi.fn() }));

const cue: Cue = { id: "live", number: "1", name: "Mic", type: "liveAudio", volume: 0.5 };
let engine: AudioEngine;
let ctx: AudioContext;
let trackStop: ReturnType<typeof vi.fn>;
let gains: GainNode[];
let panners: StereoPannerNode[];

beforeEach(() => {
  gains = [];
  panners = [];
  trackStop = vi.fn();
  vi.mocked(openAudioInputStream).mockResolvedValue({
    getTracks: () => [{ stop: trackStop }],
  } as unknown as MediaStream);
  ctx = {
    ...createMockAudioContext(),
    state: "running",
    currentTime: 0,
    createGain: () => {
      const node = createMockAudioNode({
        gain: {
          value: 1,
          cancelScheduledValues: vi.fn(),
          setValueAtTime: vi.fn(),
          setValueCurveAtTime: vi.fn(),
        },
      }) as unknown as GainNode;
      gains.push(node);
      return node;
    },
    createStereoPanner: () => {
      const node = createMockAudioNode({ pan: { value: 0 } }) as unknown as StereoPannerNode;
      panners.push(node);
      return node;
    },
    createMediaStreamSource: vi.fn(() => createMockAudioNode()),
  } as unknown as AudioContext;
  vi.stubGlobal(
    "AudioContext",
    class {
      constructor() {
        Object.assign(this, ctx);
      }
    },
  );
  engine = new AudioEngine();
});

afterEach(async () => {
  await engine.stopAll();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("cue meter lifecycle", () => {
  it("starts live input without an asset and updates its gain, pan and routing", async () => {
    await engine.sync([cue.id], [cue], 1);
    expect(openAudioInputStream).toHaveBeenCalledOnce();
    expect(gains[1].gain.value).toBe(0.5);
    await engine.sync([cue.id], [{ ...cue, volume: 0.2, pan: -1, audioBusId: "bus" }], 1, {}, [
      { id: "bus", name: "Bus", volume: 1 },
    ]);
    expect(openAudioInputStream).toHaveBeenCalledOnce();
    expect(gains[1].gain.value).toBe(0.2);
    expect(panners[0].pan.value).toBe(-1);
    await engine.stopAll();
    expect(trackStop).toHaveBeenCalledOnce();
    expect(audioMeters.getReading(cueMeterId(cue.id))).toBe(SILENT_METER);
  });

  it("closes pending microphone capture if playback stops before permission resolves", async () => {
    let resolve!: (stream: MediaStream) => void;
    vi.mocked(openAudioInputStream).mockImplementation(
      () =>
        new Promise((r) => {
          resolve = r;
        }),
    );
    const sync = engine.sync([cue.id], [cue], 1);
    await vi.waitFor(() => expect(openAudioInputStream).toHaveBeenCalledOnce());
    await engine.stopAll();
    resolve({ getTracks: () => [{ stop: trackStop }] } as unknown as MediaStream);
    await sync;
    expect(trackStop).toHaveBeenCalledOnce();
    expect(ctx.createMediaStreamSource).not.toHaveBeenCalled();
  });

  it("disconnects a naturally finished audio voice and its meter", async () => {
    const source = {
      ...createMockAudioNode(),
      start: vi.fn(),
      stop: vi.fn(),
      disconnect: vi.fn(),
      onended: null,
    };
    ctx.createBufferSource = () => source as unknown as AudioBufferSourceNode;
    vi.mocked(getCachedAudioBuffer).mockReturnValue({ duration: 10 } as AudioBuffer);
    const finished = vi.fn();
    engine.onVoiceEnded(finished);
    await engine.sync(
      ["audio"],
      [{ ...cue, id: "audio", type: "audio", assetPath: "tone.wav" }],
      1,
    );
    expect(source.onended).toBeTypeOf("function");
    (source.onended as unknown as () => void)();
    expect(source.disconnect).toHaveBeenCalledOnce();
    expect(finished).toHaveBeenCalledWith("audio");
    expect(audioMeters.getReading(cueMeterId("audio"))).toBe(SILENT_METER);
  });

  it("streams audio that is not decoded yet and decodes it for the next GO", async () => {
    const voice = { cueId: "long", goAtMs: 1 } as VideoVoice;
    vi.mocked(getCachedAudioBuffer).mockReturnValue(undefined);
    vi.mocked(resolveAssetBlob).mockResolvedValue(new Blob());
    vi.mocked(startVideoVoice).mockReturnValue(voice);
    const longCue: Cue = { ...cue, id: "long", type: "audio", assetPath: "long.mp3" };

    await engine.sync([longCue.id], [longCue], 1, { long: 1 });
    expect(startVideoVoice).toHaveBeenCalledOnce();
    expect(preloadAudioBuffer).toHaveBeenCalledWith("long.mp3");

    await engine.sync([longCue.id], [longCue], 1, { long: 1 });
    expect(startVideoVoice).toHaveBeenCalledOnce();

    await engine.sync([], [longCue], 1);
    expect(stopVideoVoice).toHaveBeenCalledWith(voice);
  });
});

describe("built-in fades", () => {
  type MockGainParam = {
    cancelScheduledValues: ReturnType<typeof vi.fn>;
    setValueCurveAtTime: ReturnType<typeof vi.fn>;
  };
  const fadedCue: Cue = {
    id: "faded",
    number: "2",
    name: "Faded",
    type: "audio",
    assetPath: "tone.wav",
    fadeIn: 1,
    fadeOut: 2,
  };

  beforeEach(() => {
    ctx.createBufferSource = () =>
      ({
        ...createMockAudioNode(),
        start: vi.fn(),
        stop: vi.fn(),
        onended: null,
      }) as unknown as AudioBufferSourceNode;
    vi.mocked(getCachedAudioBuffer).mockReturnValue({ duration: 10 } as AudioBuffer);
  });

  it("puts a fade envelope gain between the source and the level gain", async () => {
    await engine.sync([fadedCue.id], [fadedCue], 1, { faded: Date.now() });
    const envelope = gains[gains.length - 2].gain as unknown as MockGainParam;
    // Fade in at GO, fade out before the end of the 10 s file.
    expect(envelope.setValueCurveAtTime).toHaveBeenCalledTimes(2);
    expect(envelope.setValueCurveAtTime.mock.calls[0][2]).toBeCloseTo(1, 1);
    expect(envelope.setValueCurveAtTime.mock.calls[1][2]).toBeCloseTo(2, 1);
    expect(gains[gains.length - 1].gain.value).toBe(1);
  });

  it("switches a running voice to a fade out when the transport releases it", async () => {
    const goAtMs = Date.now() - 4_000;
    await engine.sync([fadedCue.id], [fadedCue], 1, { faded: goAtMs });
    const envelope = gains[gains.length - 2].gain as unknown as MockGainParam;
    envelope.setValueCurveAtTime.mockClear();
    envelope.cancelScheduledValues.mockClear();

    const release = { startedAtMs: Date.now(), durationSec: 2 };
    await engine.sync([fadedCue.id], [fadedCue], 1, { faded: goAtMs }, [], {
      faded: release,
    });
    expect(envelope.cancelScheduledValues).toHaveBeenCalledOnce();
    expect(envelope.setValueCurveAtTime).toHaveBeenCalledOnce();
    const [curve, , duration] = envelope.setValueCurveAtTime.mock.calls[0];
    expect(duration).toBeCloseTo(2, 1);
    expect(curve[0]).toBeCloseTo(1, 1);
    expect(curve[curve.length - 1]).toBeCloseTo(0);

    // Same release again: nothing is rescheduled.
    await engine.sync([fadedCue.id], [fadedCue], 1, { faded: goAtMs }, [], {
      faded: release,
    });
    expect(envelope.setValueCurveAtTime).toHaveBeenCalledOnce();
  });

  it("passes the release on to streamed and video voices", async () => {
    const voice = { cueId: "long", goAtMs: 1 } as VideoVoice;
    vi.mocked(getCachedAudioBuffer).mockReturnValue(undefined);
    vi.mocked(resolveAssetBlob).mockResolvedValue(new Blob());
    vi.mocked(startVideoVoice).mockReturnValue(voice);
    const longCue: Cue = { ...fadedCue, id: "long", assetPath: "long.mp3" };

    await engine.sync([longCue.id], [longCue], 1, { long: 1 });
    expect(scheduleVideoVoiceEnvelope).not.toHaveBeenCalled();

    const release = { startedAtMs: Date.now(), durationSec: 2 };
    await engine.sync([longCue.id], [longCue], 1, { long: 1 }, [], { long: release });
    expect(scheduleVideoVoiceEnvelope).toHaveBeenCalledWith(voice, longCue, release);

    // Fired again mid fade: the transport drops the release and the voice recovers.
    voice.release = release;
    await engine.sync([longCue.id], [longCue], 1, { long: 1 }, [], {});
    expect(scheduleVideoVoiceEnvelope).toHaveBeenLastCalledWith(voice, longCue, undefined);
  });
});

describe("context recovery after idle", () => {
  type FakeCtx = AudioContext & {
    resume: ReturnType<typeof vi.fn>;
    close: ReturnType<typeof vi.fn>;
  };
  let created: FakeCtx[];
  let nextState: string[];
  let hangResume: boolean[];

  beforeEach(() => {
    created = [];
    nextState = [];
    hangResume = [];
    vi.stubGlobal(
      "AudioContext",
      class {
        constructor() {
          const hang = hangResume.shift() ?? false;
          const self = this as unknown as { state: string };
          Object.assign(this, {
            ...createMockAudioContext(),
            state: nextState.shift() ?? "running",
            currentTime: 0,
            createBufferSource: vi.fn(() => ({
              ...createMockAudioNode(),
              start: vi.fn(),
              stop: vi.fn(),
            })),
            resume: vi.fn(() => {
              if (hang) return new Promise(() => {});
              self.state = "running";
              return Promise.resolve();
            }),
            close: vi.fn(async () => {
              self.state = "closed";
            }),
          });
          created.push(this as unknown as FakeCtx);
        }
      },
    );
    vi.mocked(getCachedAudioBuffer).mockReturnValue({ duration: 10 } as AudioBuffer);
    engine = new AudioEngine();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const audioCue: Cue = { ...cue, id: "audio", type: "audio", assetPath: "tone.wav" };

  it("resumes a context WebKit left interrupted", async () => {
    nextState = ["interrupted"];
    await engine.sync([audioCue.id], [audioCue], 1, { audio: 1 });
    expect(created).toHaveLength(1);
    expect(created[0].resume).toHaveBeenCalledOnce();
    expect(created[0].state).toBe("running");
  });

  it("rebuilds the context when resume never settles, instead of hanging GO", async () => {
    vi.useFakeTimers();
    nextState = ["interrupted"];
    hangResume = [true];
    const sync = engine.sync([audioCue.id], [audioCue], 1, { audio: 1 });
    await vi.advanceTimersByTimeAsync(600);
    await sync;
    expect(created).toHaveLength(2);
    expect(created[0].close).toHaveBeenCalledOnce();
    expect(created[1].state).toBe("running");
  });

  it("rebuilds a context whose clock stopped and replays running cues", async () => {
    vi.useFakeTimers();
    await engine.sync([audioCue.id], [audioCue], 1, { audio: 1 });
    expect(created).toHaveLength(1);
    const recovery = engine.recoverIfStalled();
    await vi.advanceTimersByTimeAsync(200);
    await recovery;
    expect(created[0].close).toHaveBeenCalledOnce();
    expect(created).toHaveLength(2);
  });

  function stallContext(ctx: FakeCtx): void {
    (ctx as unknown as { state: string }).state = "interrupted";
    ctx.resume.mockImplementation(() => new Promise(() => {}));
  }

  const bufferSources = (ctx: FakeCtx) => vi.mocked(ctx.createBufferSource);

  it("seek click on a stuck context restarts the cue on the rebuilt context", async () => {
    vi.useFakeTimers();
    await engine.sync([audioCue.id], [audioCue], 1, { audio: 1 });
    stallContext(created[0]);
    bufferSources(created[0]).mockClear();

    // One click: the window pointerdown unlock and the seek's sync race each other.
    const unlock = engine.unlock();
    const sync = engine.sync([audioCue.id], [audioCue], 1, { audio: 2 });
    await vi.advanceTimersByTimeAsync(600);
    const [ctx] = await Promise.all([unlock, sync]);

    expect(created).toHaveLength(2);
    expect(ctx).toBe(created[1]);
    expect(bufferSources(created[0])).not.toHaveBeenCalled();
    expect(bufferSources(created[1])).toHaveBeenCalled();
  });

  it("restarts running cues when a click alone rebuilds a stuck context", async () => {
    vi.useFakeTimers();
    await engine.sync([audioCue.id], [audioCue], 1, { audio: 1 });
    stallContext(created[0]);

    const unlock = engine.unlock();
    await vi.advanceTimersByTimeAsync(600);
    await unlock;
    await vi.advanceTimersByTimeAsync(10);
    expect(created).toHaveLength(2);
    expect(bufferSources(created[1])).toHaveBeenCalledOnce();
  });

  it("keeps a healthy context", async () => {
    vi.useFakeTimers();
    await engine.sync([audioCue.id], [audioCue], 1, { audio: 1 });
    const recovery = engine.recoverIfStalled();
    await vi.advanceTimersByTimeAsync(50);
    (created[0] as unknown as { currentTime: number }).currentTime = 0.15;
    await vi.advanceTimersByTimeAsync(150);
    await recovery;
    expect(created[0].close).not.toHaveBeenCalled();
    expect(created).toHaveLength(1);
  });
});
