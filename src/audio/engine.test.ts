import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { openAudioInputStream } from "../lib/audio-input";
import { resolveAssetBlob } from "../platform/vfs-asset";
import type { Cue } from "../types/cue";
import { getCachedAudioBuffer, preloadAudioBuffer } from "./buffer-cache";
import { AudioEngine } from "./engine";
import { audioMeters, cueMeterId, SILENT_METER } from "./meters";
import { createMockAudioContext, createMockAudioNode } from "./test/mock-audio-context";
import { startVideoVoice, stopVideoVoice, type VideoVoice } from "./video-voice";

vi.mock("../lib/audio-input", () => ({ openAudioInputStream: vi.fn() }));
vi.mock("./effects/worklet", () => ({ prepareBusEffects: vi.fn(async () => {}) }));
vi.mock("../platform/vfs-asset", () => ({ resolveAssetBlob: vi.fn() }));
vi.mock("./video-voice", () => ({
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
      const node = createMockAudioNode({ gain: { value: 1 } }) as unknown as GainNode;
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
