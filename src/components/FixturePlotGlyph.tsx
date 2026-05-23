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
  editMode: boolean;
  disableTooltip?: boolean;
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
      {channels.map((channel, index) => (
        <Typography
          key={`${fixture.id}-${index}`}
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
            key={index}
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
  editMode,
  disableTooltip = false,
  onPointerDown,
}: FixturePlotGlyphProps) {
  const radius = size / 2;
  const fill = visual.fill ?? "currentColor";
  const fillOpacity = render === "abstract" ? 0.12 : Math.max(visual.opacity, 0.04);
  const label = fixture.name;
  const tooltipTitle: ReactNode = (
    <FixturePlotTooltipContent fixture={fixture} channelValues={channelValues} />
  );

  return (
    <g transform={`translate(${x}, ${y})`}>
      <circle
        r={radius}
        fill={render === "abstract" ? "transparent" : fill}
        fillOpacity={fillOpacity}
        stroke={selected ? "var(--fixture-plot-selected, #90caf9)" : "currentColor"}
        strokeOpacity={selected ? 1 : 0.35}
        strokeWidth={selected ? 0.004 : 0.002}
        style={{ pointerEvents: "none" }}
      />
      {render === "abstract" && <AbstractBars channels={visual.channels} radius={radius} />}
      {editMode && (
        <circle
          r={radius}
          fill="transparent"
          style={{ pointerEvents: "all", cursor: "grab" }}
          onPointerDown={onPointerDown}
        />
      )}
      {!editMode && (
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
    </g>
  );
}
