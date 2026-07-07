import { describe, expect, it } from "vitest";
import type { Cue } from "../types/cue";
import type { Fixture } from "../types/fixture";
import { formatLightFadeCompactSummary, resolveLightFadeSummary } from "./light-fade-summary";

const fixtures: Fixture[] = [
  {
    id: "f1",
    name: "Par",
    universe: 1,
    startAddress: 1,
    channelCount: 1,
  },
];

function testCue(
  id: string,
  number: string,
  name: string,
  type: Cue["type"],
  extra: Partial<Cue> = {},
): Cue {
  return { id, number, name, type, ...extra };
}

describe("light-fade-summary", () => {
  it("describes fade from live output to cue levels", () => {
    const target = testCue("light", "1", "Scene", "dmx", {
      dmx: { mode: "partial", fixtures: [{ fixtureId: "f1", values: [100] }] },
    });
    const fade = testCue("fade", "2", "Fade", "lightFade", {
      fadeTargetId: "light",
      fadeDuration: 3,
      lightFadeChannels: "colorIntensity",
      dmx: { mode: "partial", fixtures: [{ fixtureId: "f1", values: [200] }] },
    });

    const summary = resolveLightFadeSummary(fade, [target, fade], fixtures);
    expect(summary).toMatchObject({
      referenceLabel: "1 Scene",
      toLabel: expect.stringContaining("Par"),
      durationSec: 3,
    });
    expect(formatLightFadeCompactSummary(summary!)).toContain("→");
    expect(formatLightFadeCompactSummary(summary!)).toContain("3");
  });
});
