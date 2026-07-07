import { describe, expect, it } from "vitest";
import {
  plotStorageCoordsToPositionDegrees,
  plotViewCoordsToPositionDegrees,
} from "./fixture-plot-aim";
import type { FixturePositionAxes } from "./fixture-position";

const axes: FixturePositionAxes = {
  pan: {
    channelIndex: 0,
    fineChannelIndex: 1,
    angleRange: { start: 0, end: 540 },
    resolution: "16bit",
  },
  tilt: {
    channelIndex: 2,
    fineChannelIndex: 3,
    angleRange: { start: 0, end: 270 },
    resolution: "16bit",
  },
};

describe("fixture-plot-aim", () => {
  it("maps stage storage coords to pan/tilt degrees", () => {
    expect(plotStorageCoordsToPositionDegrees(0, 0, axes)).toEqual({ pan: 0, tilt: 0 });
    expect(plotStorageCoordsToPositionDegrees(0.5, 0.5, axes)).toEqual({ pan: 270, tilt: 135 });
    expect(plotStorageCoordsToPositionDegrees(1, 1, axes)).toEqual({ pan: 540, tilt: 270 });
  });

  it("maps view-box coords using plot width", () => {
    expect(plotViewCoordsToPositionDegrees(1, 0.5, axes)).toEqual({ pan: 270, tilt: 135 });
  });
});
