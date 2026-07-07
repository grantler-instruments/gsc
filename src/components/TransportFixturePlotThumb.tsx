import Box from "@mui/material/Box";
import { useMemo } from "react";
import { normalizeDmxCueData } from "../lib/dmx";
import {
  ensureFixturePlot,
  FIXTURE_PLOT_VIEW_HEIGHT,
  FIXTURE_PLOT_VIEW_WIDTH,
  fixturePlotStorageToView,
  fixturePlotViewBox,
  resolveFixtureVisualState,
} from "../lib/fixture-plot";
import { useProjectStore } from "../stores/project";
import type { DmxCueData } from "../types/cue";
import { FixturePlotGlyph } from "./FixturePlotGlyph";

interface TransportFixturePlotThumbProps {
  dmx: DmxCueData;
}

export function TransportFixturePlotThumb({ dmx }: TransportFixturePlotThumbProps) {
  const fixtures = useProjectStore((s) => s.fixtures);
  const fixturePlot = useProjectStore((s) => s.fixturePlot);

  const plot = useMemo(() => ensureFixturePlot(fixturePlot, fixtures), [fixturePlot, fixtures]);
  const valuesByFixtureId = useMemo(() => {
    const normalized = normalizeDmxCueData(dmx, fixtures);
    return new Map(normalized.fixtures.map((entry) => [entry.fixtureId, entry.values]));
  }, [dmx, fixtures]);

  const fixtureById = useMemo(
    () => new Map(fixtures.map((fixture) => [fixture.id, fixture])),
    [fixtures],
  );

  const entries = plot.entries.filter((entry) => valuesByFixtureId.has(entry.fixtureId));

  if (entries.length === 0) {
    return null;
  }

  return (
    <Box
      component="svg"
      viewBox={fixturePlotViewBox()}
      preserveAspectRatio="none"
      sx={{
        display: "block",
        width: "100%",
        height: "100%",
        color: "primary.main",
      }}
    >
      <rect
        x={0}
        y={0}
        width={FIXTURE_PLOT_VIEW_WIDTH}
        height={FIXTURE_PLOT_VIEW_HEIGHT}
        fill="#111"
      />
      {entries.map((entry) => {
        const fixture = fixtureById.get(entry.fixtureId);
        if (!fixture) return null;
        const values = valuesByFixtureId.get(entry.fixtureId) ?? [];
        const visual = resolveFixtureVisualState(fixture, values, entry);
        const view = fixturePlotStorageToView(entry.x, entry.y);
        return (
          <FixturePlotGlyph
            key={entry.fixtureId}
            x={view.x}
            y={view.y}
            size={entry.size}
            fixture={fixture}
            channelValues={values}
            render={entry.render}
            visual={visual}
            selected={false}
            editMode={false}
            compact
          />
        );
      })}
    </Box>
  );
}
