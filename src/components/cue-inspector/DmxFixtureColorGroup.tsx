import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";
import {
  detectFixtureColorTriplet,
  fixtureColorKindLabelKey,
  fixtureColorTripletHex,
  hexToRgb,
  isPrimaryColorChannel,
  writeFixtureTripletValues,
} from "../../lib/fixture-color";
import type {
  FixtureInspectorChannel,
  FixtureInspectorGroup,
} from "../../lib/fixture-inspector-groups";
import { fixtureChannelAddress } from "../../lib/fixtures";
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

interface DmxFixtureColorGroupProps {
  group: FixtureInspectorGroup;
  fixture: Fixture;
  values: number[];
  readOnly: boolean;
  onChannelValuesChange: (updates: ReadonlyArray<{ channelIndex: number; value: number }>) => void;
}

function DmxFixturePrimaryColorSlider({
  fixture,
  channel,
  values,
  readOnly,
  onChannelValuesChange,
}: {
  fixture: Fixture;
  channel: FixtureInspectorChannel;
  values: number[];
  readOnly: boolean;
  onChannelValuesChange: DmxFixtureColorGroupProps["onChannelValuesChange"];
}) {
  const { t } = useTranslation();
  const address = fixtureChannelAddress(fixture, channel.channelIndex);
  const value = values[channel.channelIndex] ?? 0;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
      <Stack direction="row" sx={{ alignItems: "baseline", gap: 0.75 }}>
        <Typography
          component="span"
          sx={{
            minWidth: 24,
            fontSize: 11,
            color: "text.secondary",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {address}
        </Typography>
        <Typography
          component="span"
          sx={{
            flex: 1,
            fontSize: 12,
            color: "text.secondary",
          }}
        >
          {t(fixtureColorKindLabelKey(channel.kind))}
        </Typography>
      </Stack>
      <SliderNumberField
        value={value}
        min={0}
        max={255}
        readOnly={readOnly}
        onChange={(next) =>
          onChannelValuesChange([{ channelIndex: channel.channelIndex, value: next }])
        }
      />
    </Box>
  );
}

export function DmxFixtureColorGroup({
  group,
  fixture,
  values,
  readOnly,
  onChannelValuesChange,
}: DmxFixtureColorGroupProps) {
  const { t } = useTranslation();
  const triplet = detectFixtureColorTriplet(group.channels);
  const primaryChannels = triplet
    ? triplet.channels
        .map((index) => group.channels.find((channel) => channel.channelIndex === index))
        .filter((channel): channel is FixtureInspectorChannel => channel !== undefined)
    : [];
  const auxiliaryChannels = triplet
    ? group.channels.filter((channel) => !isPrimaryColorChannel(triplet, channel.channelIndex))
    : group.channels;

  const hex = triplet ? fixtureColorTripletHex(triplet, values) : "#000000";

  return (
    <Box component="fieldset" sx={{ ...inspectorGroupSx, ...inspectorGroupCompactSx, gap: 0.75 }}>
      <Box component="legend" sx={inspectorGroupLegendSx}>
        {t("inspector.dmxGroupColor")}
      </Box>

      {triplet && (
        <>
          <Box component="label" sx={inspectorFieldSx}>
            <Box component="span" sx={inspectorFieldLabelSx}>
              {t("inspector.dmxColorPicker")}
            </Box>
            <Stack direction="row" sx={{ alignItems: "center", gap: 1 }}>
              <Box
                aria-hidden
                sx={{
                  width: 28,
                  height: 28,
                  flexShrink: 0,
                  borderRadius: 1,
                  border: 1,
                  borderColor: "divider",
                  bgcolor: hex,
                }}
              />
              <Box
                component="input"
                type="color"
                value={hex}
                disabled={readOnly}
                onChange={(event) => {
                  const rgb = hexToRgb(event.currentTarget.value);
                  if (!rgb) return;
                  onChannelValuesChange(writeFixtureTripletValues(triplet, rgb));
                }}
                sx={{
                  flex: 1,
                  minWidth: 0,
                  height: 32,
                  p: 0,
                  border: 1,
                  borderColor: "divider",
                  borderRadius: 1,
                  bgcolor: "background.default",
                  cursor: readOnly ? "not-allowed" : "pointer",
                  "&:disabled": { opacity: 0.5 },
                }}
              />
            </Stack>
          </Box>

          {primaryChannels.map((channel) => (
            <DmxFixturePrimaryColorSlider
              key={channel.channelIndex}
              fixture={fixture}
              channel={channel}
              values={values}
              readOnly={readOnly}
              onChannelValuesChange={onChannelValuesChange}
            />
          ))}
        </>
      )}

      {auxiliaryChannels.map((channel) => (
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
