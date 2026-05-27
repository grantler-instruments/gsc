import { describe, expect, it } from "vitest";
import type { Cue } from "../types/cue";
import type { Fixture } from "../types/fixture";
import { resolveTransportPreview, resolveTransportPreviewBorrow } from "./transport-preview";

const fixtures: Fixture[] = [
  {
    id: "f1",
    name: "Par 1",
    universe: 1,
    startAddress: 1,
    channelCount: 3,
  },
];

function cue(partial: Partial<Cue> & Pick<Cue, "id" | "type">): Cue {
  return {
    number: "1",
    name: "Cue",
    ...partial,
  };
}

describe("transport-preview", () => {
  it("borrows stop target with crossedOut", () => {
    const cues: Cue[] = [
      cue({ id: "v1", type: "video", assetPath: "clip.mp4" }),
      cue({ id: "s1", type: "stop", stopTargetId: "v1" }),
    ];
    expect(resolveTransportPreviewBorrow(cues[1], cues)).toEqual({
      cue: cues[0],
      crossedOut: true,
    });
  });

  it("borrows media fade target without crossedOut", () => {
    const cues: Cue[] = [
      cue({ id: "a1", type: "audio", assetPath: "song.wav" }),
      cue({ id: "f1", type: "volumeFade", fadeTargetId: "a1", fadeDuration: 2 }),
    ];
    expect(resolveTransportPreviewBorrow(cues[1], cues)).toEqual({
      cue: cues[0],
      crossedOut: false,
    });
  });

  it("resolves waveform for audio and borrowed volume fade", () => {
    const audio = cue({ id: "a1", type: "audio", assetPath: "song.wav" });
    const fade = cue({ id: "f1", type: "volumeFade", fadeTargetId: "a1", fadeDuration: 2 });
    expect(resolveTransportPreview(audio, [audio], fixtures)).toMatchObject({
      kind: "waveform",
      crossedOut: false,
    });
    expect(resolveTransportPreview(fade, [audio, fade], fixtures)).toMatchObject({
      kind: "waveform",
      crossedOut: false,
      cue: audio,
    });
  });

  it("resolves fixture plot for dmx and stop targeting dmx", () => {
    const dmx = cue({
      id: "d1",
      type: "dmx",
      dmx: { mode: "partial", fixtures: [{ fixtureId: "f1", values: [255, 0, 0] }] },
    });
    const stop = cue({ id: "s1", type: "stop", stopTargetId: "d1" });
    expect(resolveTransportPreview(dmx, [dmx], fixtures)?.kind).toBe("fixturePlot");
    expect(resolveTransportPreview(stop, [dmx, stop], fixtures)).toMatchObject({
      kind: "fixturePlot",
      crossedOut: true,
    });
  });
});
