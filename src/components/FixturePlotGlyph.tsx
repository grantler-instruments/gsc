import Box from "@mui/material/Box";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import type { PointerEvent, ReactNode } from "react";
import type { FixtureVisualState } from "../lib/fixture-plot";
import { fixturePlotTooltipChannels } from "../lib/fixture-plot";
import type { Fixture } from "../types/fixture";
import type { FixtureRenderKind } from "../types/fixture-plot";

interface FixturePlotGlyphProps {
  x: number;
  y: number;
  size: number;
  fixture: Fixture;
  channelValues: number[];
  render: FixtureRenderKind;
  visual: FixtureVisualState;
  selected: boolean;
  /** Brief pulse when selected from the cue inspector. */
  pulseInspect?: boolean;
  /** Whether this fixture has levels in the active DMX cue. */
  inCue?: boolean;
  editMode: boolean;
  /** Click/drag to inspect or aim (non-layout mode). */
  interactive?: boolean;
  disableTooltip?: boolean;
  /** Hide labels/tooltips for tiny transport thumbnails. */
  compact?: boolean;
  onPointerDown?: (event: PointerEvent<SVGCircleElement>) => void;
}

const LABEL_OFFSET = 0.016;

function FixturePlotTooltipContent({
  fixture,
  channelValues,
}: {
  fixture: Fixture;
  channelValues: number[];
}) {
  const channels = fixturePlotTooltipChannels(fixture, channelValues);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 0.25, py: 0.25 }}>
      <Typography
        component="span"
        variant="caption"
        sx={{ fontWeight: 600, color: "text.primary" }}
      >
        {fixture.name}
      </Typography>
      {channels.map((channel) => (
        <Typography
          key={`${fixture.id}-${channel.label}`}
          component="span"
          variant="caption"
          sx={{
            display: "flex",
            justifyContent: "space-between",
            gap: 1.5,
            fontVariantNumeric: "tabular-nums",
            color: "text.secondary",
          }}
        >
          <span>{channel.label}</span>
          <span>{channel.value}</span>
        </Typography>
      ))}
    </Box>
  );
}

function AbstractBars({ channels, radius }: { channels: number[]; radius: number }) {
  const barCount = Math.max(channels.length, 1);
  const barWidth = (radius * 1.4) / barCount;
  const startX = -((barCount - 1) * barWidth) / 2;

  return (
    <>
      {channels.map((value, index) => {
        const height = (value / 255) * radius * 1.2;
        const x = startX + index * barWidth;
        return (
          <rect
            key={`${x}-${value}`}
            x={x}
            y={radius * 0.2 - height}
            width={barWidth * 0.75}
            height={height}
            rx={barWidth * 0.1}
            fill="currentColor"
            fillOpacity={value > 0 ? 0.95 : 0.25}
          />
        );
      })}
    </>
  );
}

export function FixturePlotGlyph({
  x,
  y,
  size,
  fixture,
  channelValues,
  render,
  visual,
  selected,
  pulseInspect = false,
  inCue = true,
  editMode,
  interactive = false,
  disableTooltip = false,
  compact = false,
  onPointerDown,
}: FixturePlotGlyphProps) {
  const radius = size / 2;
  const fill = visual.fill ?? "currentColor";
  const dimmed = !inCue;
  const fillOpacity =
    render === "abstract"
      ? 0.12
      : Math.max(visual.opacity * (dimmed ? 0.35 : 1), dimmed ? 0.02 : 0.04);
  const label = fixture.name;
  const beam = visual.beam;
  const beamLength = radius * 1.8 * (beam?.reach ?? 1);
  const beamX = beam ? Math.sin(beam.directionRadians) * beamLength : 0;
  const beamY = beam ? -Math.cos(beam.directionRadians) * beamLength : 0;
  const tooltipTitle: ReactNode = (
    <FixturePlotTooltipContent fixture={fixture} channelValues={channelValues} />
  );

  return (
    <g transform={`translate(${x}, ${y})`}>
      {render === "movingHead" && beam && (
        <line
          x1={0}
          y1={0}
          x2={beamX}
          y2={beamY}
          stroke={fill}
          strokeOpacity={Math.max(visual.opacity, 0.35)}
          strokeWidth={0.003}
          strokeLinecap="round"
          style={{ pointerEvents: "none" }}
        />
      )}
      {pulseInspect && (
        <circle
          r={radius * 1.35}
          fill="none"
          stroke="currentColor"
          strokeWidth={0.004}
          opacity={0.9}
          style={{ pointerEvents: "none" }}
        >
          <animate
            attributeName="r"
            values={`${radius * 1.15};${radius * 1.55};${radius * 1.15}`}
            dur="1.2s"
            repeatCount="indefinite"
          />
          <animate
            attributeName="opacity"
            values="0.9;0.2;0.9"
            dur="1.2s"
            repeatCount="indefinite"
          />
        </circle>
      )}
      <circle
        r={radius}
        fill={render === "abstract" ? "transparent" : fill}
        fillOpacity={fillOpacity}
        stroke={selected ? "var(--fixture-plot-selected, #90caf9)" : "currentColor"}
        strokeOpacity={selected ? 1 : dimmed ? 0.2 : 0.35}
        strokeWidth={selected ? 0.004 : 0.002}
        strokeDasharray={dimmed && !selected ? "0.012 0.008" : undefined}
        style={{ pointerEvents: "none" }}
      />
      {render === "movingHead" && (
        <circle
          r={radius * 0.18}
          fill={fill}
          fillOpacity={Math.max(visual.opacity, 0.5)}
          style={{ pointerEvents: "none" }}
        />
      )}
      {render === "abstract" && <AbstractBars channels={visual.channels} radius={radius} />}
      {editMode && (
        <circle
          r={radius}
          fill="transparent"
          style={{ pointerEvents: "all", cursor: "grab" }}
          onPointerDown={onPointerDown}
        />
      )}
      {interactive && (
        <circle
          r={radius}
          fill="transparent"
          style={{
            pointerEvents: "all",
            cursor: render === "movingHead" ? "crosshair" : "pointer",
          }}
          onPointerDown={onPointerDown}
        />
      )}
      {!editMode && !interactive && !compact && (
        <foreignObject
          x={-radius}
          y={-radius}
          width={size}
          height={size}
          style={{ overflow: "visible" }}
        >
          <div style={{ width: "100%", height: "100%" }}>
            <Tooltip
              title={tooltipTitle}
              arrow
              placement="top"
              enterDelay={250}
              disableHoverListener={disableTooltip}
              disableFocusListener
              describeChild
            >
              <div
                role="img"
                aria-label={fixture.name}
                style={{
                  width: "100%",
                  height: "100%",
                  borderRadius: "50%",
                }}
              />
            </Tooltip>
          </div>
        </foreignObject>
      )}
      {!compact && (
        <text
          y={radius + LABEL_OFFSET}
          textAnchor="middle"
          fontSize={0.028}
          fill="currentColor"
          fillOpacity={0.75}
          style={{ pointerEvents: "none", userSelect: "none" }}
        >
          {label.length > 14 ? `${label.slice(0, 13)}…` : label}
        </text>
      )}
    </g>
  );
}
