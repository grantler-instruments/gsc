import type { Fixture } from "../../types/fixture";
import { createFixture, normalizeFixture } from "../../lib/fixtures";
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
      set((state) => ({ fixtures: [...state.fixtures, fixture] }));
      return fixture;
    },

    removeFixture: (id) =>
      set((state) => ({
        fixtures: state.fixtures.filter((fixture) => fixture.id !== id),
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
      set((state) => ({
        fixtures: [
          ...state.fixtures,
          ...fixtures.map((fixture) => normalizeFixture(fixture)),
        ],
      })),
  };
}
