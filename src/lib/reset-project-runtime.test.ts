import { beforeEach, describe, expect, it } from "vitest";
import { useProjectStore } from "../stores/project";
import { initialProjectData } from "../stores/project/initial-state";
import type { Fixture } from "../types/fixture";
import { replaceWithFreshProject } from "./reset-project-runtime";

const sampleFixture: Fixture = {
  id: "f1",
  name: "Par 1",
  universe: 1,
  startAddress: 1,
  channelCount: 6,
};

describe("replaceWithFreshProject", () => {
  beforeEach(() => {
    useProjectStore.setState({
      ...initialProjectData,
      fixtures: [sampleFixture],
      fixturePlot: {
        entries: [
          {
            fixtureId: "f1",
            x: 0.5,
            y: 0.5,
            size: 0.12,
            render: "dimmer",
          },
        ],
        backgroundAssetPath: "/assets/images/stage.png",
      },
      midiMappings: [
        {
          id: "m1",
          match: { status: 144, channel: 1, note: 60, velocity: 127 },
          action: { type: "panic" },
        },
      ],
      audioBuses: [{ id: "b1", name: "Main", volume: 1 }],
    });
  });

  it("clears fixtures and plot when starting a new project", () => {
    replaceWithFreshProject("Fresh Show");

    const state = useProjectStore.getState();
    expect(state.name).toBe("Fresh Show");
    expect(state.fixtures).toEqual([]);
    expect(state.fixturePlot.entries).toEqual([]);
    expect(state.fixturePlot.backgroundAssetPath).toBeUndefined();
    expect(state.midiMappings).toEqual([]);
    expect(state.audioBuses).toEqual([]);
  });
});
