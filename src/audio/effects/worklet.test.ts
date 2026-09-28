import { runInNewContext } from "node:vm";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BUS_EFFECTS_WORKLET_SOURCE, prepareBusEffects } from "./worklet";

interface Processor {
  process: (
    inputs: Float32Array[][],
    outputs: Float32Array[][],
    params: Record<string, Float32Array>,
  ) => boolean;
  port: { onmessage: (event: { data: string }) => void };
}

function processor(type: string, rate = 48000) {
  const registration: {
    implementation?: {
      new (options: { processorOptions: { type: string } }): Processor;
      parameterDescriptors: { name: string; defaultValue: number }[];
    };
  } = {};
  runInNewContext(BUS_EFFECTS_WORKLET_SOURCE, {
    sampleRate: rate,
    AudioWorkletProcessor: class {
      port = {};
    },
    registerProcessor: (
      _name: string,
      implementation: NonNullable<typeof registration.implementation>,
    ) => {
      registration.implementation = implementation;
    },
  });
  // Registration runs synchronously in the isolated worklet scope.
  const implementation = registration.implementation;
  if (!implementation) throw new Error("Processor was not registered");
  const instance = new implementation({ processorOptions: { type } });
  const defaults = Object.fromEntries(
    implementation.parameterDescriptors.map(({ name, defaultValue }) => [name, defaultValue]),
  );
  return {
    instance,
    render(
      left: number[],
      right: number[],
      values: Record<string, number> = {},
      trigger: number[][] = [],
    ) {
      const output = [new Float32Array(left.length), new Float32Array(left.length)];
      const params = Object.fromEntries(
        Object.entries({ ...defaults, ...values }).map(([key, value]) => [
          key,
          new Float32Array([value]),
        ]),
      );
      instance.process(
        [
          [new Float32Array(left), new Float32Array(right)],
          trigger.map((channel) => new Float32Array(channel)),
        ],
        [output],
        params,
      );
      return output.map((channel) => Array.from(channel));
    },
  };
}

const constant = (value: number, length = 4800) => Array<number>(length).fill(value);

describe("bus effect DSP", () => {
  it.each([
    44100, 48000, 96000,
  ])("limits stereo peaks to the ceiling at %i Hz without shifting the image", (rate) => {
    const limiter = processor("limiter", rate);
    const [left, right] = limiter.render([0.1, 4, -2, 0.4], [0.2, 2, -4, 0.8], { ceilingDb: -6 });
    const ceiling = 10 ** (-6 / 20);
    expect(Math.max(...left.map(Math.abs), ...right.map(Math.abs))).toBeLessThanOrEqual(
      ceiling + 1e-7,
    );
    expect(left[0]).toBeCloseTo(0.1);
    expect(right[0]).toBeCloseTo(0.2);
    expect(left[1] / right[1]).toBeCloseTo(2);
    expect(left[2] / right[2]).toBeCloseTo(0.5);
  });

  it("recovers smoothly after limiting and bypasses without residual attenuation", () => {
    const limiter = processor("limiter");
    limiter.render([4], [4], { ceilingDb: 0 });
    const [recovery] = limiter.render(constant(0.1), constant(0.1), {
      ceilingDb: 0,
      releaseMs: 100,
    });
    expect(recovery[0]).toBeCloseTo(0.025, 3);
    expect(recovery[4799]).toBeGreaterThan(recovery[0]);
    expect(recovery[4799]).toBeLessThan(0.1);
    expect(limiter.render([2], [-2], { enabled: 0 })).toEqual([[2], [-2]]);
  });

  it("ducks from either trigger channel, preserves stereo ratio, and releases when the trigger stops", () => {
    const ducker = processor("ducker");
    const params = { thresholdDb: -20, reductionDb: 12, attackMs: 10, releaseMs: 100 };
    const [left, right] = ducker.render(constant(1), constant(0.5), params, [
      constant(0),
      constant(-0.5),
    ]);
    expect(left[0]).toBeGreaterThan(0.99);
    expect(left[4799]).toBeCloseTo(10 ** (-12 / 20), 3);
    expect(left[4799] / right[4799]).toBeCloseTo(2);
    const [recovery] = ducker.render(constant(1, 48000), constant(1, 48000), params);
    expect(recovery[47999]).toBeCloseTo(1, 3);
  });

  it("does not duck without a trigger, below threshold, or when bypassed", () => {
    const ducker = processor("ducker");
    expect(ducker.render([0.5], [0.25])).toEqual([[0.5], [0.25]]);
    expect(ducker.render([0.5], [0.25], {}, [[0.001]])).toEqual([[0.5], [0.25]]);
    expect(ducker.render([0.5], [0.25], { enabled: 0 }, [[1]])).toEqual([[0.5], [0.25]]);
  });

  it("keeps ducking active for opposite-polarity stereo triggers", () => {
    const [left] = processor("ducker").render(constant(1), constant(1), { attackMs: 1 }, [
      constant(0.5),
      constant(-0.5),
    ]);
    expect(left[4799]).toBeCloseTo(10 ** (-12 / 20), 4);
  });

  it("applies width, mono, channel swap, output polarity, and bypass", () => {
    const stereo = processor("stereo");
    expect(stereo.render([1], [0])).toEqual([[1], [0]]);
    expect(stereo.render([1], [0], { width: 0 })).toEqual([[0.5], [0.5]]);
    expect(stereo.render([1], [0], { width: 2 })).toEqual([[1.5], [-0.5]]);
    expect(stereo.render([1], [0], { width: 2, mono: 1 })).toEqual([[0.5], [0.5]]);
    expect(stereo.render([1], [0.25], { swap: 1 })).toEqual([[0.25], [1]]);
    expect(stereo.render([1], [0.25], { invertLeft: 1, invertRight: 1 })).toEqual([[-1], [-0.25]]);
    expect(stereo.render([1], [0.25], { enabled: 0, mono: 1, swap: 1, invertLeft: 1 })).toEqual([
      [1],
      [0.25],
    ]);
  });

  it("stops processing disposed nodes", () => {
    const { instance } = processor("limiter");
    instance.port.onmessage({ data: "dispose" });
    expect(instance.process([], [], {})).toBe(false);
  });
});

describe("worklet preparation", () => {
  afterEach(() => vi.restoreAllMocks());

  it("shares registration across concurrent callers and revokes the module URL", async () => {
    const addModule = vi.fn().mockResolvedValue(undefined);
    const revoke = vi.spyOn(URL, "revokeObjectURL");
    const ctx = { audioWorklet: { addModule } } as unknown as AudioContext;
    await Promise.all([prepareBusEffects(ctx), prepareBusEffects(ctx)]);
    expect(addModule).toHaveBeenCalledTimes(1);
    expect(revoke).toHaveBeenCalledWith(addModule.mock.calls[0][0]);
  });

  it("allows registration to retry after a load failure", async () => {
    const addModule = vi
      .fn()
      .mockRejectedValueOnce(new Error("load failed"))
      .mockResolvedValue(undefined);
    const ctx = { audioWorklet: { addModule } } as unknown as AudioContext;
    await expect(prepareBusEffects(ctx)).rejects.toThrow("load failed");
    await expect(prepareBusEffects(ctx)).resolves.toBeUndefined();
    expect(addModule).toHaveBeenCalledTimes(2);
  });
});
