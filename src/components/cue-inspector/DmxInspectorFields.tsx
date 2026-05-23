import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import {
  addAllDmxFixturesToCue,
  addDmxFixtureToCue,
  availableDmxFixtures,
  clampDmxValue,
  fixtureChannelLabel,
  removeDmxFixtureFromCue,
  updateDmxFixtureChannelValue,
} from "../../lib/dmx";
import { fixtureChannelAddress } from "../../lib/fixtures";
import { useProjectStore } from "../../stores/project";
import type { Cue } from "../../types/cue";
import { SliderNumberField } from "../SliderNumberField";
import { AddDmxFixturesMenu } from "./AddDmxFixturesMenu";
import { DmxPreviewField } from "./DmxPreviewField";

interface DmxInspectorFieldsProps {
  cue: Cue;
  readOnly: boolean;
  dmxDisabled: boolean;
  onUpdate: (patch: Partial<Cue>) => void;
}

export function DmxInspectorFields({
  cue,
  readOnly,
  dmxDisabled,
  onUpdate,
}: DmxInspectorFieldsProps) {
  const fixtures = useProjectStore((s) => s.fixtures);

  if ((cue.type !== "dmx" && cue.type !== "lightFade") || !cue.dmx) return null;

  if (fixtures.length === 0) {
    return (
      <>
        <DmxPreviewField cue={cue} readOnly={readOnly} dmxDisabled={dmxDisabled} />
        <Typography component="p" sx={{ m: 0, fontSize: 13, color: "text.secondary" }}>
          Patch fixtures in the Fixtures panel before editing light levels.
        </Typography>
      </>
    );
  }

  const dmx = cue.dmx;
  const addableFixtures = availableDmxFixtures(dmx, fixtures);

  const patchDmx = (next: typeof dmx) => {
    onUpdate({ dmx: next });
  };

  const handleAddFixture = (fixtureId: string) => {
    const fixture = fixtures.find((item) => item.id === fixtureId);
    if (!fixture) return;
    patchDmx(addDmxFixtureToCue(dmx, fixture));
  };

  const handleAddAllFixtures = () => {
    patchDmx(addAllDmxFixturesToCue(dmx, fixtures));
  };

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        flex: 1,
        minHeight: 0,
      }}
    >
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          gap: 1.5,
          flexShrink: 0,
        }}
      >
        <DmxPreviewField cue={cue} readOnly={readOnly} dmxDisabled={dmxDisabled} />

        {dmxDisabled && (
          <Typography component="p" sx={{ m: 0, fontSize: 13, color: "text.secondary" }}>
            DMX output requires the desktop app.
          </Typography>
        )}

        <AddDmxFixturesMenu
          fullWidth
          addableFixtures={addableFixtures}
          readOnly={readOnly}
          onAddAll={handleAddAllFixtures}
          onAdd={handleAddFixture}
        />

        <Typography component="p" sx={{ m: 0, fontSize: 12, color: "text.secondary" }}>
          {cue.type === "lightFade"
            ? "Fades listed fixtures to these levels. Other channels stay as they are."
            : "Updates only the fixtures listed below. Other levels are unchanged."}
        </Typography>
      </Box>

      <Box
        sx={{
          flex: 1,
          overflowY: "auto",
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          gap: 1.5,
          py: 1.5,
        }}
      >
        {dmx.fixtures.length === 0 && (
          <Typography component="p" sx={{ m: 0, fontSize: 13, color: "text.secondary" }}>
            Add fixtures to define this cue&apos;s levels.
          </Typography>
        )}

        {dmx.fixtures.map((entry) => {
          const fixture = fixtures.find((item) => item.id === entry.fixtureId);
          if (!fixture) return null;

          return (
            <Box
              key={entry.fixtureId}
              sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}
            >
              <Stack direction="row" sx={{ alignItems: "center", gap: 0.5 }}>
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
                  {fixture.name}
                </Typography>
                {!readOnly && (
                  <IconButton
                    size="small"
                    title="Remove fixture from cue"
                    onClick={() => patchDmx(removeDmxFixtureFromCue(dmx, entry.fixtureId))}
                  >
                    ×
                  </IconButton>
                )}
              </Stack>
              {entry.values.map((value, index) => {
                const channelLabel = fixtureChannelLabel(fixture, index);
                return (
                  <Stack
                    key={`${entry.fixtureId}-${index}`}
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
                      {fixtureChannelAddress(fixture, index)}
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
                      {channelLabel ?? "Level"}
                    </Typography>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <SliderNumberField
                        value={value}
                        min={0}
                        max={255}
                        readOnly={readOnly}
                        onChange={(next) =>
                          patchDmx(
                            updateDmxFixtureChannelValue(
                              dmx,
                              entry.fixtureId,
                              index,
                              clampDmxValue(next),
                            ),
                          )
                        }
                      />
                    </Box>
                  </Stack>
                );
              })}
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}
