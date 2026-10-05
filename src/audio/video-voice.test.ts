import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getMediaDurationSec } from "../lib/media-duration";
import type { Cue } from "../types/cue";
import { createMockAudioNode } from "./test/mock-audio-context";
import { scheduleVideoVoiceEnvelope, seekVideoVoice, startVideoVoice } from "./video-voice";

vi.mock("../vfs/engine", () => ({ vfsGetObjectUrl: vi.fn(() => "blob:video") }));
vi.mock("../lib/media-duration", () => ({ getMediaDurationSec: vi.fn(() => undefined) }));

type Listener = () => void;

function fakeVideo() {
  const listeners = new Map<string, Listener[]>();
  return {
    src: "",
    duration: Number.NaN,
    readyState: 0,
    currentTime: 0,
    paused: true,
    style: {} as Record<string, string>,
    addEventListener(type: string, fn: Listener) {
      listeners.set(type, [...(listeners.get(type) ?? []), fn]);
    },
    dispatch(type: string) {
      for (const fn of listeners.get(type) ?? []) fn();
    },
    play: vi.fn(async () => {}),
    pause: vi.fn(),
    load: vi.fn(),
    remove: vi.fn(),
    removeAttribute: vi.fn(),
  };
}

function mockParam() {
  return {
    value: 1,
    cancelScheduledValues: vi.fn(),
    setValueAtTime: vi.fn(),
    setValueCurveAtTime: vi.fn(),
  };
}

let video: ReturnType<typeof fakeVideo>;
let envelopeParam: ReturnType<typeof mockParam>;
let ctx: AudioContext;

const cue: Cue = {
  id: "v",
  number: "1",
  name: "Video",
  type: "video",
  assetPath: "clip.mp4",
  fadeIn: 1,
  fadeOut: 2,
};

/** Curve lengths (seconds) of every scheduled ramp since the last reset. */
function scheduledDurations(): number[] {
  return envelopeParam.setValueCurveAtTime.mock.calls.map((call) => call[2] as number);
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(50_000);
  video = fakeVideo();
  vi.stubGlobal("document", {
    createElement: () => video,
    body: { appendChild: vi.fn() },
  });
  let gainCount = 0;
  ctx = {
    currentTime: 3,
    createMediaElementSource: () => createMockAudioNode(),
    createGain: () => {
      // First gain is the fade envelope, second the level gain.
      const gain = mockParam();
      if (gainCount++ === 0) envelopeParam = gain;
      return { ...createMockAudioNode(), gain, context: ctx };
    },
    createStereoPanner: () => createMockAudioNode({ pan: { value: 0 } }),
  } as unknown as AudioContext;
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
  vi.mocked(getMediaDurationSec).mockReturnValue(undefined);
});

function start(release?: { startedAtMs: number; durationSec: number }) {
  const voice = startVideoVoice(cue, ctx, Date.now(), vi.fn(), () => undefined, release);
  if (!voice) throw new Error("voice not started");
  return voice;
}

describe("video voice fade envelope", () => {
  it("fades in at once but waits for the duration before scheduling the end fade", () => {
    start();
    expect(scheduledDurations()).toEqual([1]);
  });

  it("adds the end fade once the element reports its duration", () => {
    start();
    envelopeParam.setValueCurveAtTime.mockClear();
    video.duration = 10;
    video.dispatch("loadedmetadata");
    const durations = scheduledDurations();
    expect(durations).toHaveLength(2);
    expect(durations[0]).toBeCloseTo(1);
    expect(durations[1]).toBeCloseTo(2);
  });

  it("uses the cached media duration before metadata loads", () => {
    vi.mocked(getMediaDurationSec).mockReturnValue(10);
    start();
    expect(scheduledDurations()).toHaveLength(2);
  });

  it("reschedules from the new position after a seek", () => {
    const voice = start();
    video.duration = 10;
    envelopeParam.setValueCurveAtTime.mockClear();
    seekVideoVoice(voice, cue, Date.now() - 7_000);
    // 7 s in: past the fade in, 1 s before the 2 s end fade starts.
    const [[curve, startTime, duration]] = envelopeParam.setValueCurveAtTime.mock.calls;
    expect(startTime).toBeCloseTo(4);
    expect(duration).toBeCloseTo(2);
    expect(curve[0]).toBeCloseTo(1);
  });

  it("keeps a release across reschedules until it is cleared", () => {
    const release = { startedAtMs: Date.now(), durationSec: 3 };
    const voice = start(release);
    expect(voice.release).toBe(release);
    expect(scheduledDurations()).toEqual([3]);

    envelopeParam.setValueCurveAtTime.mockClear();
    video.duration = 10;
    video.dispatch("loadedmetadata");
    expect(scheduledDurations()).toEqual([3]);

    envelopeParam.setValueCurveAtTime.mockClear();
    scheduleVideoVoiceEnvelope(voice, cue, undefined);
    expect(voice.release).toBeUndefined();
    expect(scheduledDurations()).toHaveLength(2);
  });
});
