import Box from "@mui/material/Box";
import { useTranslation } from "react-i18next";
import { detectFixtureColorTriplet } from "../../lib/fixture-color";
import {
  type FixtureInspectorGroup,
  type FixtureInspectorGroupId,
  groupFixtureInspectorChannels,
} from "../../lib/fixture-inspector-groups";
import type { Fixture } from "../../types/fixture";
import { inspectorGroupCompactSx, inspectorGroupLegendSx, inspectorGroupSx } from "../inspectorSx";
import { DmxFixtureChannelControl } from "./DmxFixtureChannelControl";
import { DmxFixtureColorGroup } from "./DmxFixtureColorGroup";

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
      {groups.map((group) => {
        if (group.id === "color" && detectFixtureColorTriplet(group.channels)) {
          return (
            <DmxFixtureColorGroup
              key={group.id}
              group={group}
              fixture={fixture}
              values={values}
              readOnly={readOnly}
              onChannelValuesChange={onChannelValuesChange}
            />
          );
        }

        return (
          <DmxFixtureChannelGroup
            key={group.id}
            group={group}
            fixture={fixture}
            values={values}
            readOnly={readOnly}
            onChannelValuesChange={onChannelValuesChange}
          />
        );
      })}
    </Box>
  );
}
