import { afterEach, describe, expect, it } from "vitest";
import { MixerGraph } from "./mixer";
import { createMockAudioContext } from "./test/mock-audio-context";

describe("MixerGraph", () => {
  let ctx: AudioContext;
  let mixer: MixerGraph;

  afterEach(() => {
    mixer?.dispose();
  });

  it("routes voices to master when the project has no buses", () => {
    ctx = createMockAudioContext();
    mixer = new MixerGraph(ctx);
    mixer.sync([]);

    expect(mixer.resolveOutput(undefined)).toBe(mixer.masterOutput);
    expect(mixer.resolveOutput("missing-bus")).toBe(mixer.masterOutput);
  });

  it("routes voices to a bus input when the bus exists", () => {
    ctx = createMockAudioContext();
    mixer = new MixerGraph(ctx);
    mixer.sync([{ id: "b1", name: "Music", volume: 1 }]);

    const busInput = mixer.resolveOutput("b1");
    expect(busInput).not.toBe(mixer.masterOutput);
    expect(mixer.resolveOutput(undefined)).toBe(mixer.masterOutput);
  });

  it("falls back to master when a cue references a removed bus", () => {
    ctx = createMockAudioContext();
    mixer = new MixerGraph(ctx);
    mixer.sync([{ id: "b1", name: "Music", volume: 1 }]);
    mixer.sync([]);

    expect(mixer.resolveOutput("b1")).toBe(mixer.masterOutput);
  });

  it("syncs empty bus lists without error for legacy projects", () => {
    ctx = createMockAudioContext();
    mixer = new MixerGraph(ctx);

    expect(() => mixer.sync([])).not.toThrow();
    expect(mixer.resolveOutput(undefined)).toBe(mixer.masterOutput);
  });

  it("applies bus fader and pan values during sync", () => {
    const gains: Array<{ gain: { value: number } }> = [];
    const panners: Array<{ pan: { value: number } }> = [];
    ctx = {
      destination: createMockAudioContext().destination,
      createGain: () => {
        const node = { gain: { value: 1 }, connect: () => node, disconnect: () => {} };
        gains.push(node);
        return node as unknown as GainNode;
      },
      createStereoPanner: () => {
        const node = { pan: { value: 0 }, connect: () => node, disconnect: () => {} };
        panners.push(node);
        return node as unknown as StereoPannerNode;
      },
    } as unknown as AudioContext;

    mixer = new MixerGraph(ctx);
    mixer.sync([{ id: "b1", name: "Music", volume: 0.6, pan: -0.5 }]);

    expect(gains[2]?.gain.value).toBe(0.6);
    expect(panners[0]?.pan.value).toBe(-0.5);
  });
});
