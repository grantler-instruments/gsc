import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useEffect, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import { formatStopTargetLabel, getFadeTarget } from "../../lib/cues";
import {
  addAllDmxFixturesToCue,
  addDmxFixtureToCue,
  availableDmxFixtures,
  copyDmxLevelsFromCue,
  grabDmxLevelsFromOutput,
  removeDmxFixtureFromCue,
  resolveLightFadeDmx,
  updateDmxFixtureChannelValues,
} from "../../lib/dmx";
import { applyHomeToAllMovingHeadsInCue } from "../../lib/fixture-home";
import { isMovingHeadFixture } from "../../lib/fixture-position";
import { useProjectStore } from "../../stores/project";
import { useUiStore } from "../../stores/ui";
import type { Cue } from "../../types/cue";
import { AddDmxFixturesMenu } from "./AddDmxFixturesMenu";
import { DmxFixtureChannels } from "./DmxFixtureChannels";
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
  const updateFixture = useProjectStore((s) => s.updateFixture);
  const inspectedFixtureId = useUiStore((s) => s.inspectedFixtureId);
  const setInspectedFixtureId = useUiStore((s) => s.setInspectedFixtureId);
  const fixtureRefs = useRef(new Map<string, HTMLDivElement | null>());

  useEffect(() => {
    if (!inspectedFixtureId) return;
    const node = fixtureRefs.current.get(inspectedFixtureId);
    node?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [inspectedFixtureId, cue.id, dmxDisabled]);

  const copySourceCues = useMemo(
    () =>
      cues.filter(
        (item) =>
          item.id !== cue.id &&
          (item.type === "dmx" || item.type === "lightFade") &&
          Boolean(item.dmx?.fixtures.length),
      ),
    [cue.id, cues],
  );

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
  const hasMovingHeadsInCue = dmx.fixtures.some((entry) => {
    const fixture = fixtures.find((item) => item.id === entry.fixtureId);
    return fixture ? isMovingHeadFixture(fixture) : false;
  });

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
        gap: 1.5,
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

      {!readOnly && (!isReferencedLightFade || isLightFade) && (
        <Stack direction="row" sx={{ gap: 0.75, flexWrap: "wrap", alignItems: "center" }}>
          <Button
            size="small"
            variant="outlined"
            disabled={dmxDisabled}
            onClick={() => patchDmx(grabDmxLevelsFromOutput(storedDmx, fixtures))}
          >
            {t("inspector.dmxGrabFromOutput")}
          </Button>
          {hasMovingHeadsInCue && (
            <Button
              size="small"
              variant="outlined"
              onClick={() => patchDmx(applyHomeToAllMovingHeadsInCue(storedDmx, fixtures))}
            >
              {t("inspector.dmxHomeAllMovingHeads")}
            </Button>
          )}
          {copySourceCues.length > 0 && (
            <Box component="label" sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              <Typography component="span" variant="caption" sx={{ color: "text.secondary" }}>
                {t("inspector.dmxCopyLevelsFrom")}
              </Typography>
              <select
                value=""
                disabled={dmxDisabled}
                onChange={(event) => {
                  const sourceId = event.currentTarget.value;
                  if (!sourceId) return;
                  const source = copySourceCues.find((item) => item.id === sourceId);
                  if (!source?.dmx) return;
                  patchDmx(copyDmxLevelsFromCue(storedDmx, source.dmx, fixtures));
                  event.currentTarget.value = "";
                }}
              >
                <option value="">{t("inspector.selectCuePlaceholder")}</option>
                {copySourceCues.map((source) => (
                  <option key={source.id} value={source.id}>
                    {formatStopTargetLabel(source)}
                  </option>
                ))}
              </select>
            </Box>
          )}
        </Stack>
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
        const inspected = inspectedFixtureId === entry.fixtureId;

        return (
          <Box
            key={entry.fixtureId}
            ref={(node) => {
              fixtureRefs.current.set(entry.fixtureId, node);
            }}
            sx={{
              display: "flex",
              flexDirection: "column",
              gap: 0.75,
              borderRadius: 1,
              outline: inspected ? 1 : 0,
              outlineColor: "primary.main",
              outlineOffset: 2,
              bgcolor: inspected ? "action.selected" : "transparent",
              transition: "background-color 0.15s ease",
            }}
          >
            <Stack direction="row" sx={{ alignItems: "center", gap: 0.5 }}>
              <Typography
                variant="caption"
                onClick={() => setInspectedFixtureId(inspected ? null : entry.fixtureId)}
                title={t("inspector.dmxSelectFixtureOnPlot")}
                sx={{
                  m: 0,
                  flex: 1,
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                  color: inspected ? "primary.main" : "text.secondary",
                  cursor: "pointer",
                  "&:hover": { color: "primary.main" },
                }}
              >
                {fixture.name}
              </Typography>
              {!readOnly &&
                (!isReferencedLightFade || isLightFade) &&
                copySourceCues.some((source) =>
                  source.dmx?.fixtures.some((item) => item.fixtureId === entry.fixtureId),
                ) && (
                  <Box
                    component="select"
                    value=""
                    disabled={dmxDisabled}
                    title={t("inspector.dmxCopyFixtureLevelsFrom")}
                    onChange={(event) => {
                      const sourceId = event.currentTarget.value;
                      if (!sourceId) return;
                      const source = copySourceCues.find((item) => item.id === sourceId);
                      if (!source?.dmx) return;
                      patchDmx(
                        copyDmxLevelsFromCue(storedDmx, source.dmx, fixtures, [entry.fixtureId]),
                      );
                      event.currentTarget.value = "";
                    }}
                    sx={{
                      fontSize: 11,
                      maxWidth: 120,
                      py: 0.25,
                      color: "text.secondary",
                    }}
                  >
                    <option value="">{t("inspector.dmxCopyFixture")}</option>
                    {copySourceCues
                      .filter((source) =>
                        source.dmx?.fixtures.some((item) => item.fixtureId === entry.fixtureId),
                      )
                      .map((source) => (
                        <option key={source.id} value={source.id}>
                          {formatStopTargetLabel(source)}
                        </option>
                      ))}
                  </Box>
                )}
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
            <DmxFixtureChannels
              fixture={fixture}
              values={entry.values}
              readOnly={readOnly}
              onChannelValuesChange={(updates) =>
                patchDmx(updateDmxFixtureChannelValues(storedDmx, entry.fixtureId, updates))
              }
              onSaveFixtureHome={
                readOnly
                  ? undefined
                  : (fixtureId, position) => updateFixture(fixtureId, { homePanTilt: position })
              }
            />
          </Box>
        );
      })}
    </Box>
  );
}
