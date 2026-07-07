import type { StoreApi } from "zustand";
import { ensureFixturePlot, normalizeFixturePlot } from "../../lib/fixture-plot";
import type { FixturesProfileImportMode } from "../../lib/fixture-profile";
import { mergeImportedFixturePlots } from "../../lib/fixture-profile";
import { createFixture, normalizeFixture } from "../../lib/fixtures";
import type { Fixture } from "../../types/fixture";
import type { FixturePlot } from "../../types/fixture-plot";
import type { ProjectState } from "./types";

type ProjectStore = StoreApi<ProjectState>;

export function createFixtureActions(
  set: ProjectStore["setState"],
  get: ProjectStore["getState"],
): Pick<
  ProjectState,
  "addFixture" | "removeFixture" | "updateFixture" | "appendFixtures" | "importFixturesProfile"
> {
  return {
    addFixture: (overrides = {}) => {
      const fixture = createFixture(get().fixtures, overrides);
      set((state) => ({
        fixtures: [...state.fixtures, fixture],
        fixturePlot: ensureFixturePlot(state.fixturePlot, [...state.fixtures, fixture]),
      }));
      return fixture;
    },

    removeFixture: (id) =>
      set((state) => ({
        fixtures: state.fixtures.filter((fixture) => fixture.id !== id),
        fixturePlot: {
          ...state.fixturePlot,
          entries: state.fixturePlot.entries.filter((entry) => entry.fixtureId !== id),
        },
      })),

    updateFixture: (id, patch) =>
      set((state) => ({
        fixtures: state.fixtures.map((fixture) =>
          fixture.id === id ? normalizeFixture({ ...fixture, ...patch, id: fixture.id }) : fixture,
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

    importFixturesProfile: (
      fixtures: Fixture[],
      fixturePlot: FixturePlot | undefined,
      mode: FixturesProfileImportMode,
    ) =>
      set((state) => {
        const imported = fixtures.map((fixture) => normalizeFixture(fixture));
        if (mode === "replace") {
          return {
            fixtures: imported,
            fixturePlot: normalizeFixturePlot(fixturePlot, imported),
          };
        }

        const nextFixtures = [...state.fixtures, ...imported];
        return {
          fixtures: nextFixtures,
          fixturePlot: mergeImportedFixturePlots(state.fixturePlot, fixturePlot, nextFixtures),
        };
      }),
  };
}
