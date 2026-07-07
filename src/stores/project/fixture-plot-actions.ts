import type { StoreApi } from "zustand";
import {
  ensureFixturePlot,
  fixturePlotNeedsSync,
  normalizeFixturePlot,
  updateFixturePlotEntryPosition,
} from "../../lib/fixture-plot";
import { runWithoutHistory } from "../../lib/project-history";
import type { FixturePlot, FixturePlotEntry } from "../../types/fixture-plot";
import type { ProjectState } from "./types";

type ProjectStore = StoreApi<ProjectState>;

export function createFixturePlotActions(
  set: ProjectStore["setState"],
  get: ProjectStore["getState"],
): Pick<
  ProjectState,
  | "syncFixturePlot"
  | "updateFixturePlotEntry"
  | "setFixturePlot"
  | "setFixturePlotBackground"
  | "moveFixturePlotEntry"
> {
  return {
    syncFixturePlot: () => {
      const { fixtures, fixturePlot } = get();
      if (!fixturePlotNeedsSync(fixturePlot, fixtures)) return;
      runWithoutHistory(() => {
        set({ fixturePlot: ensureFixturePlot(fixturePlot, fixtures) });
      });
    },

    setFixturePlot: (plot: FixturePlot) => {
      const { fixtures } = get();
      set({ fixturePlot: normalizeFixturePlot(plot, fixtures) });
    },

    setFixturePlotBackground: (backgroundAssetPath: string | undefined) => {
      const { fixtures, fixturePlot } = get();
      set({
        fixturePlot: normalizeFixturePlot(
          {
            ...fixturePlot,
            backgroundAssetPath: backgroundAssetPath?.trim() || undefined,
          },
          fixtures,
        ),
      });
    },

    updateFixturePlotEntry: (
      fixtureId: string,
      patch: Partial<Omit<FixturePlotEntry, "fixtureId">>,
    ) => {
      set((state) => {
        const fixture = state.fixtures.find((item) => item.id === fixtureId);
        if (!fixture) return state;

        const plot = ensureFixturePlot(state.fixturePlot, state.fixtures);
        const entries = plot.entries.map((entry) => {
          if (entry.fixtureId !== fixtureId) return entry;
          const normalized = normalizeFixturePlot(
            {
              entries: [{ ...entry, ...patch, fixtureId }],
            },
            [fixture],
          ).entries[0];
          return normalized ?? entry;
        });

        return { fixturePlot: { ...plot, entries } };
      });
    },

    moveFixturePlotEntry: (fixtureId: string, x: number, y: number) => {
      applyFixturePlotEntryMove(set, get, fixtureId, x, y);
    },
  };
}

export function applyFixturePlotEntryMove(
  set: ProjectStore["setState"],
  get: ProjectStore["getState"],
  fixtureId: string,
  x: number,
  y: number,
): void {
  const { fixturePlot, fixtures } = get();
  set({
    fixturePlot: updateFixturePlotEntryPosition(
      ensureFixturePlot(fixturePlot, fixtures),
      fixtureId,
      x,
      y,
      fixtures,
    ),
  });
}
