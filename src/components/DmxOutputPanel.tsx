import Box from "@mui/material/Box";
import LinearProgress from "@mui/material/LinearProgress";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useMemo } from "react";
import { groupDmxOutputChannelsByFixture, listDmxOutputChannels } from "../lib/dmx-output";
import { formatFixturePatch } from "../lib/fixtures";
import { useDmxOutputStore } from "../stores/dmx-output";
import { useFadeStore } from "../stores/fade";
import { useProjectStore } from "../stores/project";
import { inspectorFieldLabelSx, inspectorFieldsSx } from "./inspectorSx";
import { PanelHeader } from "./layout/PanelHeader";

export function DmxOutputPanel() {
  const fixtures = useProjectStore((s) => s.fixtures);
  const revision = useDmxOutputStore((s) => s.revision);
  const fadeFrameMs = useFadeStore((s) => s.frameMs);

  const groups = useMemo(() => {
    void revision;
    void fadeFrameMs;
    return groupDmxOutputChannelsByFixture(listDmxOutputChannels(fixtures));
  }, [fixtures, revision, fadeFrameMs]);

  if (fixtures.length === 0) {
    return (
      <>
        <PanelHeader title="DMX" />
        <Box sx={{ ...inspectorFieldsSx, justifyContent: "center" }}>
          <Typography variant="caption" color="text.secondary" sx={{ m: 0 }}>
            Patch fixtures in the Fixtures panel to monitor DMX output.
          </Typography>
        </Box>
      </>
    );
  }

  return (
    <>
      <PanelHeader title="DMX" />

      <Box sx={{ ...inspectorFieldsSx, flex: 1, overflow: "auto" }}>
        <Typography component="p" sx={{ m: 0, fontSize: 12, color: "text.secondary" }}>
          Live output levels from the current rig state, including active light cues and fades.
        </Typography>

        {groups.map((group) => {
          const fixture = fixtures.find((item) => item.id === group.fixtureId);
          if (!fixture) return null;

          return (
            <Box key={group.fixtureId} sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
              <Stack direction="row" sx={{ alignItems: "baseline", gap: 0.75 }}>
                <Typography
                  variant="caption"
                  sx={{
                    m: 0,
                    flex: 1,
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                    color: "text.secondary",
                  }}
                >
                  {group.fixtureName}
                </Typography>
                <Typography component="span" sx={{ m: 0, fontSize: 11, color: "text.secondary" }}>
                  {formatFixturePatch(fixture)}
                </Typography>
              </Stack>

              {group.channels.map((channel) => (
                <Stack
                  key={`${channel.fixtureId}-${channel.channelIndex}`}
                  direction="row"
                  sx={{ gap: 0.75, alignItems: "center" }}
                >
                  <Typography
                    component="span"
                    sx={{
                      minWidth: 28,
                      fontSize: 12,
                      color: "text.secondary",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {channel.address}
                  </Typography>
                  <Typography
                    component="span"
                    sx={{
                      minWidth: 56,
                      flexShrink: 0,
                      fontSize: 12,
                      color: "text.secondary",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {channel.label ?? "Level"}
                  </Typography>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <LinearProgress
                      variant="determinate"
                      value={(channel.value / 255) * 100}
                      sx={{
                        height: 6,
                        borderRadius: 1,
                        bgcolor: "background.default",
                        "& .MuiLinearProgress-bar": {
                          bgcolor: channel.value > 0 ? "primary.main" : "divider",
                        },
                      }}
                    />
                  </Box>
                  <Typography
                    component="span"
                    sx={{
                      minWidth: 32,
                      fontSize: 12,
                      fontVariantNumeric: "tabular-nums",
                      textAlign: "right",
                      color: channel.value > 0 ? "text.primary" : "text.secondary",
                    }}
                  >
                    {channel.value}
                  </Typography>
                </Stack>
              ))}
            </Box>
          );
        })}

        {groups.length === 0 && (
          <Typography component="span" sx={inspectorFieldLabelSx}>
            No patched channels
          </Typography>
        )}
      </Box>
    </>
  );
}
