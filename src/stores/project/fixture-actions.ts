import type { Fixture } from "../../types/fixture";
import { createFixture, normalizeFixture } from "../../lib/fixtures";
import { ensureFixturePlot } from "../../lib/fixture-plot";
import type { StoreApi } from "zustand";
import type { ProjectState } from "./types";

type ProjectStore = StoreApi<ProjectState>;

export function createFixtureActions(
  set: ProjectStore["setState"],
  get: ProjectStore["getState"],
): Pick<ProjectState, "addFixture" | "removeFixture" | "updateFixture" | "appendFixtures"> {
  return {
    addFixture: (overrides = {}) => {
      const fixture = createFixture(get().fixtures, overrides);
      set((state) => ({
        fixtures: [...state.fixtures, fixture],
        fixturePlot: ensureFixturePlot(state.fixturePlot, [
          ...state.fixtures,
          fixture,
        ]),
      }));
      return fixture;
    },

    removeFixture: (id) =>
      set((state) => ({
        fixtures: state.fixtures.filter((fixture) => fixture.id !== id),
        fixturePlot: {
          ...state.fixturePlot,
          entries: state.fixturePlot.entries.filter(
            (entry) => entry.fixtureId !== id,
          ),
        },
      })),

    updateFixture: (id, patch) =>
      set((state) => ({
        fixtures: state.fixtures.map((fixture) =>
          fixture.id === id
            ? normalizeFixture({ ...fixture, ...patch, id: fixture.id })
            : fixture,
        ),
      })),

    appendFixtures: (fixtures: Fixture[]) =>
      set((state) => {
        const nextFixtures = [
          ...state.fixtures,
          ...fixtures.map((fixture) => normalizeFixture(fixture)),
        ];
        return {
          fixtures: nextFixtures,
          fixturePlot: ensureFixturePlot(state.fixturePlot, nextFixtures),
        };
      }),
  };
}
