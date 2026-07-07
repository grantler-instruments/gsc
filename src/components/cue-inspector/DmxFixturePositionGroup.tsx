import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import type {
  FixtureInspectorChannel,
  FixtureInspectorGroup,
} from "../../lib/fixture-inspector-groups";
import {
  detectFixturePositionAxes,
  type FixturePositionAxes,
  type FixturePositionDegrees,
  formatFixtureDegrees,
  isPositionAxisChannel,
  readFixturePositionDegrees,
  resolveFixtureHomePosition,
  writeFixturePositionDegrees,
} from "../../lib/fixture-position";
import type { Fixture } from "../../types/fixture";
import {
  inspectorFieldLabelSx,
  inspectorFieldSx,
  inspectorGroupCompactSx,
  inspectorGroupLegendSx,
  inspectorGroupSx,
} from "../inspectorSx";
import { SliderNumberField } from "../SliderNumberField";
import { DmxFixtureChannelControl } from "./DmxFixtureChannelControl";

interface DmxFixturePositionGroupProps {
  group: FixtureInspectorGroup;
  fixture: Fixture;
  values: number[];
  readOnly: boolean;
  onChannelValuesChange: (updates: ReadonlyArray<{ channelIndex: number; value: number }>) => void;
  onSaveHome?: (position: FixturePositionDegrees) => void;
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function degreesToPadCoord(value: number, start: number, end: number): number {
  const span = end - start;
  if (span === 0) return 0.5;
  return clamp01((value - start) / span);
}

function padCoordToDegrees(value: number, start: number, end: number): number {
  const span = end - start;
  return start + clamp01(value) * span;
}

function PositionPad({
  axes,
  position,
  readOnly,
  onChange,
}: {
  axes: FixturePositionAxes;
  position: { pan: number; tilt: number };
  readOnly: boolean;
  onChange: (position: { pan: number; tilt: number }) => void;
}) {
  const { t } = useTranslation();
  const padRef = useRef<HTMLDivElement>(null);
  const panX = degreesToPadCoord(position.pan, axes.pan.angleRange.start, axes.pan.angleRange.end);
  const tiltY = degreesToPadCoord(
    position.tilt,
    axes.tilt.angleRange.start,
    axes.tilt.angleRange.end,
  );

  const applyPointer = useCallback(
    (clientX: number, clientY: number) => {
      const pad = padRef.current;
      if (!pad || readOnly) return;
      const rect = pad.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      const x = clamp01((clientX - rect.left) / rect.width);
      const y = clamp01((clientY - rect.top) / rect.height);
      onChange({
        pan: padCoordToDegrees(x, axes.pan.angleRange.start, axes.pan.angleRange.end),
        tilt: padCoordToDegrees(y, axes.tilt.angleRange.start, axes.tilt.angleRange.end),
      });
    },
    [axes, onChange, readOnly],
  );

  return (
    <Box component="label" sx={inspectorFieldSx}>
      <Box component="span" sx={inspectorFieldLabelSx}>
        {t("inspector.dmxPositionPad")}
      </Box>
      <Box
        ref={padRef}
        onPointerDown={(event) => {
          if (readOnly) return;
          event.currentTarget.setPointerCapture(event.pointerId);
          applyPointer(event.clientX, event.clientY);
        }}
        onPointerMove={(event) => {
          if (readOnly || !event.currentTarget.hasPointerCapture(event.pointerId)) return;
          applyPointer(event.clientX, event.clientY);
        }}
        onPointerUp={(event) => {
          if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId);
          }
        }}
        sx={{
          position: "relative",
          width: "100%",
          aspectRatio: "2 / 1",
          borderRadius: 1,
          border: 1,
          borderColor: "divider",
          bgcolor: "background.default",
          cursor: readOnly ? "default" : "crosshair",
          touchAction: "none",
          backgroundImage:
            "linear-gradient(to right, rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.05) 1px, transparent 1px)",
          backgroundSize: "20% 20%",
        }}
      >
        <Box
          sx={{
            position: "absolute",
            left: `${panX * 100}%`,
            top: `${tiltY * 100}%`,
            width: 10,
            height: 10,
            borderRadius: "50%",
            bgcolor: "primary.main",
            border: 2,
            borderColor: "background.paper",
            transform: "translate(-50%, -50%)",
            pointerEvents: "none",
          }}
        />
      </Box>
      <Stack direction="row" sx={{ justifyContent: "space-between", gap: 1 }}>
        <Typography component="span" variant="caption" sx={{ color: "text.secondary" }}>
          {t("inspector.dmxPan")}: {formatFixtureDegrees(position.pan)}
        </Typography>
        <Typography component="span" variant="caption" sx={{ color: "text.secondary" }}>
          {t("inspector.dmxTilt")}: {formatFixtureDegrees(position.tilt)}
        </Typography>
      </Stack>
    </Box>
  );
}

function PositionAxisField({
  label,
  value,
  min,
  max,
  readOnly,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  readOnly: boolean;
  onChange: (value: number) => void;
}) {
  return (
    <SliderNumberField
      label={label}
      value={value}
      min={min}
      max={max}
      step={0.1}
      readOnly={readOnly}
      inputWidth={64}
      onChange={onChange}
    />
  );
}

export function DmxFixturePositionGroup({
  group,
  fixture,
  values,
  readOnly,
  onChannelValuesChange,
  onSaveHome,
}: DmxFixturePositionGroupProps) {
  const { t } = useTranslation();
  const axes = detectFixturePositionAxes(fixture, group.channels);
  if (!axes) return null;

  const position = readFixturePositionDegrees(axes, values);
  const homePosition = resolveFixtureHomePosition(fixture, axes);
  const auxiliaryChannels = group.channels.filter(
    (channel) => !isPositionAxisChannel(axes, channel.channelIndex),
  );

  const applyPosition = (next: { pan: number; tilt: number }) => {
    onChannelValuesChange(writeFixturePositionDegrees(axes, next));
  };

  return (
    <Box component="fieldset" sx={{ ...inspectorGroupSx, ...inspectorGroupCompactSx, gap: 0.75 }}>
      <Box component="legend" sx={inspectorGroupLegendSx}>
        {t("inspector.dmxGroupPosition")}
      </Box>

      {!readOnly && (
        <Stack direction="row" sx={{ gap: 0.75, flexWrap: "wrap" }}>
          <Button size="small" variant="outlined" onClick={() => applyPosition(homePosition)}>
            {t("inspector.dmxPositionHome")}
          </Button>
          {onSaveHome && (
            <Button size="small" variant="text" onClick={() => onSaveHome(position)}>
              {t("inspector.dmxSaveAsHome")}
            </Button>
          )}
        </Stack>
      )}

      <PositionPad axes={axes} position={position} readOnly={readOnly} onChange={applyPosition} />

      <PositionAxisField
        label={t("inspector.dmxPan")}
        value={position.pan}
        min={axes.pan.angleRange.start}
        max={axes.pan.angleRange.end}
        readOnly={readOnly}
        onChange={(pan) => applyPosition({ ...position, pan })}
      />
      <PositionAxisField
        label={t("inspector.dmxTilt")}
        value={position.tilt}
        min={axes.tilt.angleRange.start}
        max={axes.tilt.angleRange.end}
        readOnly={readOnly}
        onChange={(tilt) => applyPosition({ ...position, tilt })}
      />

      {auxiliaryChannels.map((channel: FixtureInspectorChannel) => (
        <DmxFixtureChannelControl
          key={`${channel.channelIndex}-${channel.fineChannelIndex ?? "solo"}`}
          fixture={fixture}
          channel={channel}
          values={values}
          readOnly={readOnly}
          onChannelValuesChange={onChannelValuesChange}
        />
      ))}
    </Box>
  );
}
