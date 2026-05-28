import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";
import { getFadeTarget } from "../../lib/cues";
import {
  addAllDmxFixturesToCue,
  addDmxFixtureToCue,
  availableDmxFixtures,
  clampDmxValue,
  fixtureChannelLabel,
  removeDmxFixtureFromCue,
  resolveLightFadeDmx,
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
  cues: Cue[];
  readOnly: boolean;
  dmxDisabled: boolean;
  onUpdate: (patch: Partial<Cue>) => void;
}

export function DmxInspectorFields({
  cue,
  cues,
  readOnly,
  dmxDisabled,
  onUpdate,
}: DmxInspectorFieldsProps) {
  const { t } = useTranslation();
  const fixtures = useProjectStore((s) => s.fixtures);

  if ((cue.type !== "dmx" && cue.type !== "lightFade") || !cue.dmx) return null;

  const isLightFade = cue.type === "lightFade";
  const referenceTarget = isLightFade ? getFadeTarget(cue, cues) : undefined;
  const isReferencedLightFade = isLightFade && Boolean(referenceTarget?.dmx);
  const storedDmx = cue.dmx;
  const dmx =
    isReferencedLightFade && referenceTarget?.dmx
      ? resolveLightFadeDmx(storedDmx, referenceTarget.dmx, fixtures)
      : storedDmx;

  if (fixtures.length === 0) {
    return (
      <>
        <DmxPreviewField cue={cue} readOnly={readOnly} dmxDisabled={dmxDisabled} />
        <Typography component="p" sx={{ m: 0, fontSize: 13, color: "text.secondary" }}>
          {t("inspector.patchFixturesFirst")}
        </Typography>
      </>
    );
  }

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
        overflowY: "auto",
        gap: 1.5,
        pt: 1.5,
      }}
    >
      <DmxPreviewField cue={cue} readOnly={readOnly} dmxDisabled={dmxDisabled} />

      {dmxDisabled && (
        <Typography component="p" sx={{ m: 0, fontSize: 13, color: "text.secondary" }}>
          {t("inspector.dmxDesktopOnly")}
        </Typography>
      )}

      {!isReferencedLightFade && (
        <AddDmxFixturesMenu
          fullWidth
          addableFixtures={addableFixtures}
          readOnly={readOnly}
          onAddAll={handleAddAllFixtures}
          onAdd={handleAddFixture}
        />
      )}

      {dmx.fixtures.length === 0 && (
        <Typography component="p" sx={{ m: 0, fontSize: 13, color: "text.secondary" }}>
          {isReferencedLightFade
            ? t("inspector.referenceNoFixtures")
            : t("inspector.addFixturesForLevels")}
        </Typography>
      )}

      {dmx.fixtures.map((entry) => {
        const fixture = fixtures.find((item) => item.id === entry.fixtureId);
        if (!fixture) return null;

        return (
          <Box key={entry.fixtureId} sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
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
              {!readOnly && !isReferencedLightFade && (
                <IconButton
                  size="small"
                  title={t("inspector.removeFixtureFromCue")}
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
                  key={`${entry.fixtureId}-${fixtureChannelAddress(fixture, index)}`}
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
                    {channelLabel ?? t("inspector.level")}
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
  );
}
