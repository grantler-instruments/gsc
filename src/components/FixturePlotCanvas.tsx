import Box from "@mui/material/Box";
import { useCallback, useRef, useState } from "react";
import { ensureFixturePlot, resolveFixtureVisualState } from "../lib/fixture-plot";
import { useFixturePlotValues } from "../hooks/useFixturePlotValues";
import { useProjectStore } from "../stores/project";
import type { FixturePlotEntry } from "../types/fixture-plot";
import { FixturePlotGlyph } from "./FixturePlotGlyph";

interface FixturePlotCanvasProps {
  editMode: boolean;
  selectedFixtureId: string | null;
  onSelectFixture: (fixtureId: string | null) => void;
  onMoveEntry: (fixtureId: string, x: number, y: number) => void;
}

function clientToPlotCoords(
  svg: SVGSVGElement,
  clientX: number,
  clientY: number,
): { x: number; y: number } {
  const point = svg.createSVGPoint();
  point.x = clientX;
  point.y = clientY;
  const ctm = svg.getScreenCTM();
  if (!ctm) return { x: 0.5, y: 0.5 };
  const local = point.matrixTransform(ctm.inverse());
  return { x: local.x, y: local.y };
}

export function FixturePlotCanvas({
  editMode,
  selectedFixtureId,
  onSelectFixture,
  onMoveEntry,
}: FixturePlotCanvasProps) {
  const fixtures = useProjectStore((s) => s.fixtures);
  const fixturePlot = useProjectStore((s) => s.fixturePlot);
  const valuesByFixtureId = useFixturePlotValues();
  const svgRef = useRef<SVGSVGElement>(null);
  const dragRef = useRef<{
    fixtureId: string;
    pointerId: number;
  } | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const plot = ensureFixturePlot(fixturePlot, fixtures);
  const fixtureById = new Map(fixtures.map((fixture) => [fixture.id, fixture]));

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<SVGSVGElement>) => {
      const drag = dragRef.current;
      const svg = svgRef.current;
      if (!drag || !svg || event.pointerId !== drag.pointerId) return;
      const { x, y } = clientToPlotCoords(svg, event.clientX, event.clientY);
      onMoveEntry(drag.fixtureId, x, y);
    },
    [onMoveEntry],
  );

  const endDrag = useCallback((event: React.PointerEvent<SVGSVGElement>) => {
    const drag = dragRef.current;
    const svg = svgRef.current;
    if (!drag || !svg || event.pointerId !== drag.pointerId) return;
    svg.releasePointerCapture(event.pointerId);
    dragRef.current = null;
    setDraggingId(null);
  }, []);

  const startDrag = useCallback(
    (entry: FixturePlotEntry, event: React.PointerEvent<HTMLDivElement>) => {
      if (!editMode) return;
      event.stopPropagation();
      const svg = svgRef.current;
      if (!svg) return;
      svg.setPointerCapture(event.pointerId);
      dragRef.current = { fixtureId: entry.fixtureId, pointerId: event.pointerId };
      setDraggingId(entry.fixtureId);
      onSelectFixture(entry.fixtureId);
    },
    [editMode, onSelectFixture],
  );

  const handleBackgroundPointerDown = useCallback(() => {
    if (editMode) onSelectFixture(null);
  }, [editMode, onSelectFixture]);

  return (
    <Box
      sx={{
        position: "relative",
        width: "100%",
        aspectRatio: "16 / 9",
        bgcolor: "#111",
        color: "primary.main",
        overflow: "hidden",
      }}
    >
      <Box
        component="svg"
        ref={svgRef}
        viewBox="0 0 1 1"
        preserveAspectRatio="xMidYMid meet"
        sx={{
          display: "block",
          width: "100%",
          height: "100%",
          touchAction: editMode ? "none" : "auto",
        }}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onPointerDown={handleBackgroundPointerDown}
      >
        <rect
          x={0}
          y={0}
          width={1}
          height={1}
          fill="#111"
          style={{ pointerEvents: "all" }}
        />
        {plot.entries.map((entry) => {
          const fixture = fixtureById.get(entry.fixtureId);
          if (!fixture) return null;
          const values = valuesByFixtureId.get(entry.fixtureId) ?? [];
          const visual = resolveFixtureVisualState(fixture, values, entry);
          return (
            <FixturePlotGlyph
              key={entry.fixtureId}
              x={entry.x}
              y={entry.y}
              size={entry.size}
              fixture={fixture}
              channelValues={values}
              render={entry.render}
              visual={visual}
              selected={selectedFixtureId === entry.fixtureId}
              editMode={editMode}
              disableTooltip={draggingId === entry.fixtureId}
              onPointerDown={(event) => startDrag(entry, event)}
            />
          );
        })}
      </Box>
      {draggingId && editMode && (
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            border: 1,
            borderColor: "primary.main",
            pointerEvents: "none",
          }}
        />
      )}
    </Box>
  );
}
