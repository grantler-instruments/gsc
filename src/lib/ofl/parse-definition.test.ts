import { describe, expect, it } from "vitest";
import { parseOflFixtureDefinition } from "./parse-definition";

const CMY_FADER = {
  name: "CMY Fader",
  categories: ["Color Changer"],
  meta: { authors: ["Flo Edelmann"], createDate: "2017-12-12", lastModifyDate: "2018-07-21" },
  availableChannels: {
    Cyan: {
      fineChannelAliases: ["Cyan fine", "Cyan fine^2"],
      capability: { type: "ColorIntensity", color: "Cyan" },
    },
    Magenta: {
      fineChannelAliases: ["Magenta fine", "Magenta fine^2"],
      capability: { type: "ColorIntensity", color: "Magenta" },
    },
    Yellow: {
      fineChannelAliases: ["Yellow fine", "Yellow fine^2"],
      capability: { type: "ColorIntensity", color: "Yellow" },
    },
  },
  modes: [
    {
      name: "8 bit",
      channels: ["Cyan", "Magenta", "Yellow"],
    },
    {
      name: "16 bit",
      channels: ["Cyan", "Cyan fine", "Magenta", "Magenta fine", "Yellow", "Yellow fine"],
    },
  ],
};

const DIMMER_PACK = {
  name: "4-Channel Dimmer Pack",
  categories: ["Dimmer"],
  meta: { authors: ["Goetz"], createDate: "2021-06-17", lastModifyDate: "2021-06-17" },
  templateChannels: {
    "Dimmer $pixelKey": {
      capability: { type: "Intensity", brightnessStart: "0%", brightnessEnd: "100%" },
    },
  },
  modes: [
    {
      name: "4-channel",
      channels: ["Dimmer 1", "Dimmer 2", "Dimmer 3", "Dimmer 4"],
    },
  ],
};

const MOVING_HEAD = {
  name: "Test Spot",
  categories: ["Moving Head", "Color Changer"],
  meta: { authors: ["Test"], createDate: "2020-01-01", lastModifyDate: "2020-01-01" },
  availableChannels: {
    Pan: {
      fineChannelAliases: ["Pan fine"],
      capability: { type: "Pan", angleStart: "0deg", angleEnd: "530deg" },
    },
    "Pan fine": {
      capability: { type: "Pan", angleStart: "0deg", angleEnd: "530deg" },
    },
    Tilt: {
      fineChannelAliases: ["Tilt fine"],
      capability: { type: "Tilt", angleStart: "0deg", angleEnd: "270deg" },
    },
    "Tilt fine": {
      capability: { type: "Tilt", angleStart: "0deg", angleEnd: "270deg" },
    },
    Dimmer: {
      capability: { type: "Intensity" },
    },
    "Color Wheel": {
      capabilities: [
        { dmxRange: [0, 0], type: "WheelSlot", slotNumber: 1 },
        { dmxRange: [1, 17], type: "WheelSlot", slotNumberStart: 1, slotNumberEnd: 2 },
        { dmxRange: [18, 18], type: "WheelSlot", slotNumber: 2, comment: "Red" },
      ],
    },
  },
  modes: [
    {
      name: "Standard",
      channels: ["Pan", "Pan fine", "Tilt", "Tilt fine", "Dimmer", "Color Wheel", null],
    },
  ],
};

describe("parseOflFixtureDefinition", () => {
  it("parses CMY color channels with fine pairs", () => {
    const definition = parseOflFixtureDefinition(CMY_FADER);
    expect(definition?.name).toBe("CMY Fader");
    expect(definition?.categories).toEqual(["Color Changer"]);

    const mode16 = definition?.modes.find((entry) => entry.name === "16 bit");
    expect(mode16?.channelCount).toBe(6);
    expect(mode16?.channels.map((channel) => channel.kind)).toEqual([
      "cyan",
      "cyan",
      "magenta",
      "magenta",
      "yellow",
      "yellow",
    ]);
    expect(mode16?.channels[0]?.fineIndex).toBe(1);
    expect(mode16?.channels[1]?.coarseIndex).toBe(0);
  });

  it("resolves template channel definitions", () => {
    const definition = parseOflFixtureDefinition(DIMMER_PACK);
    const mode = definition?.modes[0];
    expect(mode?.channelCount).toBe(4);
    expect(mode?.channels.every((channel) => channel.kind === "intensity")).toBe(true);
    expect(mode?.channels.map((channel) => channel.key)).toEqual([
      "Dimmer 1",
      "Dimmer 2",
      "Dimmer 3",
      "Dimmer 4",
    ]);
  });

  it("parses pan/tilt ranges and indexed wheel capabilities", () => {
    const definition = parseOflFixtureDefinition(MOVING_HEAD);
    const mode = definition?.modes[0];
    expect(mode?.channelCount).toBe(7);

    const pan = mode?.channels[0];
    expect(pan?.kind).toBe("pan");
    expect(pan?.angleRange).toEqual({ start: 0, end: 530 });
    expect(pan?.fineIndex).toBe(1);

    const colorWheel = mode?.channels[5];
    expect(colorWheel?.kind).toBe("colorWheel");
    expect(colorWheel?.capabilities).toHaveLength(3);
    expect(colorWheel?.capabilities?.[2]?.label).toBe("Red");
    expect(colorWheel?.capabilities?.[2]?.slotNumber).toBe(2);

    expect(mode?.channels[6]?.kind).toBe("unused");
  });
});
