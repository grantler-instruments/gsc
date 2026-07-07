import Box from "@mui/material/Box";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAssetObjectUrl } from "../hooks/useAssetObjectUrl";
import { useFixturePlotValues } from "../hooks/useFixturePlotValues";
import {
  ensureFixturePlot,
  FIXTURE_PLOT_VIEW_HEIGHT,
  FIXTURE_PLOT_VIEW_WIDTH,
  fixturePlotStorageToView,
  fixturePlotViewBox,
  fixturePlotViewToStorage,
  resolveFixtureVisualState,
} from "../lib/fixture-plot";
import { plotViewCoordsToPositionDegrees } from "../lib/fixture-plot-aim";
import type { FixturePositionDegrees } from "../lib/fixture-position";
import { detectFixturePositionAxesFromFixture } from "../lib/fixture-position";
import { useProjectStore } from "../stores/project";
import type { FixturePlotEntry } from "../types/fixture-plot";
import { FixturePlotGlyph } from "./FixturePlotGlyph";

interface FixturePlotCanvasProps {
  editMode: boolean;
  expanded?: boolean;
  /** Layout edit selection (reposition mode only). */
  layoutSelectedFixtureId: string | null;
  inspectedFixtureId: string | null;
  fixtureIdsInCue: ReadonlySet<string>;
  canInteract: boolean;
  canAim: boolean;
  onLayoutSelectFixture: (fixtureId: string | null) => void;
  onInspectFixture: (fixtureId: string) => void;
  onClearInspect: () => void;
  onAimFixture: (fixtureId: string, position: FixturePositionDegrees) => void;
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
  expanded = false,
  layoutSelectedFixtureId,
  inspectedFixtureId,
  fixtureIdsInCue,
  canInteract,
  canAim,
  onLayoutSelectFixture,
  onInspectFixture,
  onClearInspect,
  onAimFixture,
  onMoveEntry,
}: FixturePlotCanvasProps) {
  const fixtures = useProjectStore((s) => s.fixtures);
  const fixturePlot = useProjectStore((s) => s.fixturePlot);
  const valuesByFixtureId = useFixturePlotValues();
  const svgRef = useRef<SVGSVGElement>(null);
  const layoutDragRef = useRef<{
    fixtureId: string;
    pointerId: number;
    offsetX: number;
    offsetY: number;
  } | null>(null);
  const aimDragRef = useRef<{
    fixtureId: string;
    pointerId: number;
  } | null>(null);
  const [draggingLayoutId, setDraggingLayoutId] = useState<string | null>(null);
  const [aimingFixtureId, setAimingFixtureId] = useState<string | null>(null);
  const [inspectPulseId, setInspectPulseId] = useState<string | null>(null);
  const prevInspectedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!inspectedFixtureId || editMode) {
      setInspectPulseId(null);
      prevInspectedRef.current = inspectedFixtureId;
      return;
    }
    if (prevInspectedRef.current !== inspectedFixtureId) {
      setInspectPulseId(inspectedFixtureId);
      const timer = window.setTimeout(() => setInspectPulseId(null), 1200);
      prevInspectedRef.current = inspectedFixtureId;
      return () => window.clearTimeout(timer);
    }
  }, [editMode, inspectedFixtureId]);

  const plot = ensureFixturePlot(fixturePlot, fixtures);
  const backgroundUrl = useAssetObjectUrl(plot.backgroundAssetPath);
  const fixtureById = new Map(fixtures.map((fixture) => [fixture.id, fixture]));

  const applyAimAt = useCallback(
    (fixtureId: string, viewX: number, viewY: number) => {
      const fixture = fixtureById.get(fixtureId);
      if (!fixture) return;
      const axes = detectFixturePositionAxesFromFixture(fixture);
      if (!axes) return;
      const position = plotViewCoordsToPositionDegrees(viewX, viewY, axes, FIXTURE_PLOT_VIEW_WIDTH);
      onAimFixture(fixtureId, position);
    },
    [fixtureById, onAimFixture],
  );

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<SVGSVGElement>) => {
      const svg = svgRef.current;
      if (!svg) return;

      const layoutDrag = layoutDragRef.current;
      if (layoutDrag && event.pointerId === layoutDrag.pointerId) {
        const { x, y } = clientToPlotCoords(svg, event.clientX, event.clientY);
        const stored = fixturePlotViewToStorage(x + layoutDrag.offsetX, y + layoutDrag.offsetY);
        onMoveEntry(layoutDrag.fixtureId, stored.x, stored.y);
        return;
      }

      const aimDrag = aimDragRef.current;
      if (aimDrag && event.pointerId === aimDrag.pointerId) {
        const { x, y } = clientToPlotCoords(svg, event.clientX, event.clientY);
        applyAimAt(aimDrag.fixtureId, x, y);
      }
    },
    [applyAimAt, onMoveEntry],
  );

  const endPointer = useCallback((event: React.PointerEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg) return;

    const layoutDrag = layoutDragRef.current;
    if (layoutDrag && event.pointerId === layoutDrag.pointerId) {
      svg.releasePointerCapture(event.pointerId);
      layoutDragRef.current = null;
      setDraggingLayoutId(null);
    }

    const aimDrag = aimDragRef.current;
    if (aimDrag && event.pointerId === aimDrag.pointerId) {
      svg.releasePointerCapture(event.pointerId);
      aimDragRef.current = null;
      setAimingFixtureId(null);
    }
  }, []);

  const startLayoutDrag = useCallback(
    (entry: FixturePlotEntry, event: React.PointerEvent<SVGCircleElement>) => {
      if (!editMode) return;
      event.stopPropagation();
      const svg = svgRef.current;
      if (!svg) return;
      const { x, y } = clientToPlotCoords(svg, event.clientX, event.clientY);
      const view = fixturePlotStorageToView(entry.x, entry.y);
      svg.setPointerCapture(event.pointerId);
      layoutDragRef.current = {
        fixtureId: entry.fixtureId,
        pointerId: event.pointerId,
        offsetX: view.x - x,
        offsetY: view.y - y,
      };
      setDraggingLayoutId(entry.fixtureId);
      onLayoutSelectFixture(entry.fixtureId);
    },
    [editMode, onLayoutSelectFixture],
  );

  const startInspectOrAim = useCallback(
    (entry: FixturePlotEntry, event: React.PointerEvent<SVGCircleElement>) => {
      if (editMode || !canInteract) return;
      event.stopPropagation();
      const svg = svgRef.current;
      if (!svg) return;

      onInspectFixture(entry.fixtureId);

      const fixture = fixtureById.get(entry.fixtureId);
      const canAimFixture =
        canAim &&
        fixture &&
        entry.render === "movingHead" &&
        detectFixturePositionAxesFromFixture(fixture);

      if (!canAimFixture) return;

      const { x, y } = clientToPlotCoords(svg, event.clientX, event.clientY);
      svg.setPointerCapture(event.pointerId);
      aimDragRef.current = { fixtureId: entry.fixtureId, pointerId: event.pointerId };
      setAimingFixtureId(entry.fixtureId);
      applyAimAt(entry.fixtureId, x, y);
    },
    [applyAimAt, canAim, canInteract, editMode, fixtureById, onInspectFixture],
  );

  const handleBackgroundPointerDown = useCallback(() => {
    if (editMode) {
      onLayoutSelectFixture(null);
      return;
    }
    if (canInteract) onClearInspect();
  }, [canInteract, editMode, onClearInspect, onLayoutSelectFixture]);

  return (
    <Box
      sx={{
        position: "relative",
        width: "100%",
        aspectRatio: "2 / 1",
        minHeight: expanded ? 200 : 120,
        maxHeight: expanded ? undefined : 160,
        bgcolor: "#111",
        color: "primary.main",
        overflow: "hidden",
        cursor: aimingFixtureId ? "crosshair" : undefined,
      }}
    >
      {backgroundUrl && (
        <Box
          component="img"
          src={backgroundUrl}
          alt=""
          sx={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "fill",
            opacity: 0.92,
            pointerEvents: "none",
            userSelect: "none",
          }}
        />
      )}
      <Box
        component="svg"
        ref={svgRef}
        viewBox={fixturePlotViewBox()}
        preserveAspectRatio="none"
        overflow="visible"
        sx={{
          position: "relative",
          zIndex: 1,
          display: "block",
          width: "100%",
          height: "100%",
          touchAction: editMode || aimingFixtureId ? "none" : "auto",
        }}
        onPointerMove={handlePointerMove}
        onPointerUp={endPointer}
        onPointerCancel={endPointer}
        onPointerDown={handleBackgroundPointerDown}
      >
        {!backgroundUrl && (
          <rect
            x={0}
            y={0}
            width={FIXTURE_PLOT_VIEW_WIDTH}
            height={FIXTURE_PLOT_VIEW_HEIGHT}
            fill="#111"
            style={{ pointerEvents: "all" }}
          />
        )}
        {backgroundUrl && (
          <rect
            x={0}
            y={0}
            width={FIXTURE_PLOT_VIEW_WIDTH}
            height={FIXTURE_PLOT_VIEW_HEIGHT}
            fill="transparent"
            style={{ pointerEvents: "all" }}
          />
        )}
        {plot.entries.map((entry) => {
          const fixture = fixtureById.get(entry.fixtureId);
          if (!fixture) return null;
          const values = valuesByFixtureId.get(entry.fixtureId) ?? [];
          const visual = resolveFixtureVisualState(fixture, values, entry);
          const view = fixturePlotStorageToView(entry.x, entry.y);
          const inCue = fixtureIdsInCue.has(entry.fixtureId);
          const inspected = inspectedFixtureId === entry.fixtureId;
          const layoutSelected = layoutSelectedFixtureId === entry.fixtureId;
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
              selected={editMode ? layoutSelected : inspected}
              pulseInspect={!editMode && inspectPulseId === entry.fixtureId}
              inCue={inCue}
              editMode={editMode}
              interactive={canInteract && !editMode}
              disableTooltip={
                draggingLayoutId === entry.fixtureId || aimingFixtureId === entry.fixtureId
              }
              onPointerDown={(event) =>
                editMode ? startLayoutDrag(entry, event) : startInspectOrAim(entry, event)
              }
            />
          );
        })}
      </Box>
      {draggingLayoutId && editMode && (
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
