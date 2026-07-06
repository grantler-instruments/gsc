import Box from "@mui/material/Box";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";
import {
  combineCoarseFineDmx,
  type FixtureInspectorChannel,
  type FixtureInspectorGroup,
  type FixtureInspectorGroupId,
  findPresetForValue,
  groupFixtureInspectorChannels,
  splitCoarseFineDmx,
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

const GROUP_I18N: Record<FixtureInspectorGroupId, string> = {
  intensity: "inspector.dmxGroupIntensity",
  color: "inspector.dmxGroupColor",
  position: "inspector.dmxGroupPosition",
  wheels: "inspector.dmxGroupWheels",
  beam: "inspector.dmxGroupBeam",
  other: "inspector.dmxGroupOther",
};

interface DmxFixtureChannelsProps {
  fixture: Fixture;
  values: number[];
  readOnly: boolean;
  onChannelValuesChange: (updates: ReadonlyArray<{ channelIndex: number; value: number }>) => void;
}

interface DmxFixtureChannelControlProps {
  fixture: Fixture;
  channel: FixtureInspectorChannel;
  values: number[];
  readOnly: boolean;
  onChannelValuesChange: DmxFixtureChannelsProps["onChannelValuesChange"];
}

function DmxFixtureChannelControl({
  fixture,
  channel,
  values,
  readOnly,
  onChannelValuesChange,
}: DmxFixtureChannelControlProps) {
  const { t } = useTranslation();
  const address = fixtureChannelAddress(fixture, channel.channelIndex);
  const coarseValue = values[channel.channelIndex] ?? 0;
  const fineValue =
    channel.fineChannelIndex !== undefined ? (values[channel.fineChannelIndex] ?? 0) : 0;
  const combinedValue =
    channel.resolution === "16bit" ? combineCoarseFineDmx(coarseValue, fineValue) : coarseValue;
  const matchedPreset = findPresetForValue(coarseValue, channel.presets);
  const showPresetSelect = Boolean(channel.presets && channel.presets.length > 1);
  const presetKey = (preset: NonNullable<typeof channel.presets>[number]) =>
    `${preset.dmxRange[0]}:${preset.dmxRange[1]}:${preset.label}`;
  const showCustomSlider =
    !showPresetSelect ||
    matchedPreset === undefined ||
    matchedPreset.dmxRange[0] !== matchedPreset.dmxRange[1] ||
    coarseValue !== matchedPreset.dmxValue;

  const applyCoarseFine = (nextCombined: number) => {
    if (channel.resolution === "16bit" && channel.fineChannelIndex !== undefined) {
      const split = splitCoarseFineDmx(nextCombined);
      onChannelValuesChange([
        { channelIndex: channel.channelIndex, value: split.coarse },
        { channelIndex: channel.fineChannelIndex, value: split.fine },
      ]);
      return;
    }
    onChannelValuesChange([{ channelIndex: channel.channelIndex, value: nextCombined }]);
  };

  const applyCoarse = (nextCoarse: number) => {
    onChannelValuesChange([{ channelIndex: channel.channelIndex, value: nextCoarse }]);
  };

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
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {channel.label}
        </Typography>
      </Stack>

      {showPresetSelect && (
        <Box component="label" sx={inspectorFieldSx}>
          <Box component="span" sx={inspectorFieldLabelSx}>
            {t("inspector.dmxPreset")}
          </Box>
          <Select
            size="small"
            value={matchedPreset ? presetKey(matchedPreset) : "custom"}
            disabled={readOnly}
            onChange={(event) => {
              const next = event.target.value;
              if (next === "custom") return;
              const preset = channel.presets?.find((entry) => presetKey(entry) === next);
              if (!preset) return;
              applyCoarse(preset.dmxValue);
            }}
            sx={{
              fontSize: 14,
              fontWeight: 400,
              textTransform: "none",
              letterSpacing: "normal",
            }}
          >
            {channel.presets?.map((preset) => (
              <MenuItem key={presetKey(preset)} value={presetKey(preset)}>
                {preset.label}
              </MenuItem>
            ))}
            <MenuItem value="custom">{t("inspector.dmxCustomValue")}</MenuItem>
          </Select>
        </Box>
      )}

      {(showCustomSlider || !showPresetSelect) && (
        <SliderNumberField
          value={channel.resolution === "16bit" ? combinedValue : coarseValue}
          min={0}
          max={channel.resolution === "16bit" ? 65535 : 255}
          readOnly={readOnly}
          inputWidth={channel.resolution === "16bit" ? 64 : 56}
          onChange={applyCoarseFine}
        />
      )}
    </Box>
  );
}

function DmxFixtureChannelGroup({
  group,
  fixture,
  values,
  readOnly,
  onChannelValuesChange,
}: {
  group: FixtureInspectorGroup;
  fixture: Fixture;
  values: number[];
  readOnly: boolean;
  onChannelValuesChange: DmxFixtureChannelsProps["onChannelValuesChange"];
}) {
  const { t } = useTranslation();

  return (
    <Box component="fieldset" sx={{ ...inspectorGroupSx, ...inspectorGroupCompactSx, gap: 0.75 }}>
      <Box component="legend" sx={inspectorGroupLegendSx}>
        {t(GROUP_I18N[group.id])}
      </Box>
      {group.channels.map((channel) => (
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

export function DmxFixtureChannels({
  fixture,
  values,
  readOnly,
  onChannelValuesChange,
}: DmxFixtureChannelsProps) {
  const groups = groupFixtureInspectorChannels(fixture);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
      {groups.map((group) => (
        <DmxFixtureChannelGroup
          key={group.id}
          group={group}
          fixture={fixture}
          values={values}
          readOnly={readOnly}
          onChannelValuesChange={onChannelValuesChange}
        />
      ))}
    </Box>
  );
}
