import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  addManualFixtureChannel,
  clampStartAddress,
  clampUniverse,
  fixtureChannelAddress,
  fixtureEndAddress,
  fixtureFitsInUniverse,
  formatFixturePatch,
  getFixtureConflicts,
  manualFixtureChannels,
  removeManualFixtureChannel,
  updateManualFixtureChannelName,
} from "../../lib/fixtures";
import { loadFixtureOflProfileForMode, loadOflSummaryFromPath } from "../../lib/ofl/load-ofl";
import { oflProfileChannelCount } from "../../lib/ofl/profile";
import type { Fixture } from "../../types/fixture";
import { inspectorFieldLabelSx, inspectorFieldSx } from "../inspectorSx";
import { FixtureNumberField } from "./FixtureNumberField";

export interface FixtureEditorProps {
  fixture: Fixture;
  fixtures: Fixture[];
  readOnly: boolean;
  onUpdate: (patch: Partial<Omit<Fixture, "id">>) => void;
}

export function FixtureEditor({ fixture, fixtures, readOnly, onUpdate }: FixtureEditorProps) {
  const { t } = useTranslation();
  const conflicts = getFixtureConflicts(fixture, fixtures);
  const outOfRange = !fixtureFitsInUniverse(fixture);
  const hasOfl = Boolean(fixture.ofl);
  const hasProfile = hasOfl;
  const [modeOptions, setModeOptions] = useState<string[]>(
    fixture.ofl ? [fixture.ofl.modeName] : [],
  );

  useEffect(() => {
    if (!fixture.ofl) {
      setModeOptions([]);
      return;
    }

    let cancelled = false;
    void loadOflSummaryFromPath(fixture.ofl.filePath, fixture.ofl).then((summary) => {
      if (cancelled || !summary) return;
      setModeOptions(summary.modes.map((mode) => mode.name));
    });

    return () => {
      cancelled = true;
    };
  }, [fixture.ofl?.filePath, fixture.ofl]);

  const handleModeChange = (modeName: string) => {
    if (!fixture.ofl || readOnly) return;
    void loadFixtureOflProfileForMode(fixture.ofl, modeName).then((profile) => {
      if (!profile) return;
      onUpdate({
        ofl: profile,
        channelCount: oflProfileChannelCount(profile),
      });
    });
  };

  const handleClearOfl = () => {
    if (readOnly) return;
    const channels = fixture.ofl?.channels.map((channel) => ({ name: channel.key })) ?? [{}];
    onUpdate({ ofl: undefined, channels });
  };

  const manualChannels = manualFixtureChannels(fixture);

  return (
    <Box
      sx={{
        borderTop: 1,
        borderColor: "divider",
        p: 1.5,
        display: "flex",
        flexDirection: "column",
        gap: 1.25,
        flexShrink: 0,
        overflowY: "visible",
        maxHeight: "none",
      }}
    >
      <Typography
        variant="caption"
        sx={{
          m: 0,
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "0.04em",
          color: "text.secondary",
        }}
      >
        {t("fixtures.patchSection")}
      </Typography>

      <Box component="label" sx={inspectorFieldSx}>
        <Typography component="span" sx={inspectorFieldLabelSx}>
          {t("fixtures.name")}
        </Typography>
        <input
          type="text"
          value={fixture.name}
          readOnly={readOnly}
          onChange={(event) => onUpdate({ name: event.currentTarget.value })}
        />
      </Box>

      {hasOfl && fixture.ofl && (
        <>
          <Typography variant="caption" sx={{ m: 0, color: "text.secondary" }}>
            {fixture.ofl.manufacturer} {fixture.ofl.model}
          </Typography>
          <Box component="label" sx={inspectorFieldSx}>
            <Typography component="span" sx={inspectorFieldLabelSx}>
              {t("fixtures.dmxMode")}
            </Typography>
            <Select
              size="small"
              fullWidth
              value={fixture.ofl.modeName}
              disabled={readOnly || modeOptions.length === 0}
              onChange={(event) => handleModeChange(event.target.value)}
            >
              {modeOptions.map((modeName) => (
                <MenuItem key={modeName} value={modeName}>
                  {modeName}
                </MenuItem>
              ))}
            </Select>
          </Box>
          <Typography variant="caption" sx={{ m: 0, color: "text.secondary" }}>
            {fixture.ofl.channels.map((channel) => channel.key).join(", ")}
          </Typography>
          {!readOnly && (
            <Button
              size="small"
              variant="text"
              onClick={handleClearOfl}
              sx={{ alignSelf: "flex-start", px: 0, minWidth: 0 }}
            >
              {t("fixtures.manualChannelCount")}
            </Button>
          )}
        </>
      )}

      <Stack direction="row" sx={{ gap: 1 }}>
        <FixtureNumberField
          label={t("fixtures.universe")}
          value={fixture.universe}
          min={1}
          readOnly={readOnly}
          onCommit={(value) => onUpdate({ universe: clampUniverse(value) })}
        />
        <FixtureNumberField
          label={t("fixtures.address")}
          value={fixture.startAddress}
          min={1}
          max={512}
          readOnly={readOnly}
          onCommit={(value) => onUpdate({ startAddress: clampStartAddress(value) })}
        />
      </Stack>

      {!hasProfile && (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
          <Typography component="span" sx={inspectorFieldLabelSx}>
            {t("fixtures.channels")}
          </Typography>
          {manualChannels.map((channel, index) => (
            <Stack
              key={`${fixture.id}-channel-${fixtureChannelAddress(fixture, index)}`}
              direction="row"
              sx={{ gap: 0.75, alignItems: "center" }}
            >
              <Typography
                component="span"
                sx={{
                  minWidth: 36,
                  fontSize: 12,
                  color: "text.secondary",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {fixtureChannelAddress(fixture, index)}
              </Typography>
              <Box component="label" sx={{ ...inspectorFieldSx, flex: 1, mb: 0 }}>
                <input
                  type="text"
                  value={channel.name ?? ""}
                  readOnly={readOnly}
                  placeholder={t("fixtures.optionalName")}
                  onChange={(event) =>
                    onUpdate({
                      channels: updateManualFixtureChannelName(
                        fixture,
                        index,
                        event.currentTarget.value,
                      ),
                    })
                  }
                />
              </Box>
              {!readOnly && manualChannels.length > 1 && (
                <IconButton
                  size="small"
                  title={t("fixtures.removeChannel")}
                  onClick={() =>
                    onUpdate({
                      channels: removeManualFixtureChannel(fixture, index),
                    })
                  }
                >
                  ×
                </IconButton>
              )}
            </Stack>
          ))}
          {!readOnly && (
            <Button
              size="small"
              variant="text"
              disabled={
                !fixtureFitsInUniverse({
                  ...fixture,
                  channelCount: manualChannels.length + 1,
                })
              }
              onClick={() => onUpdate({ channels: addManualFixtureChannel(fixture) })}
              sx={{ alignSelf: "flex-start", px: 0, minWidth: 0 }}
            >
              {t("fixtures.addChannel")}
            </Button>
          )}
        </Box>
      )}

      <Typography variant="caption" sx={{ m: 0, color: "text.secondary" }}>
        {formatFixturePatch(fixture)}
        {hasOfl
          ? ` · ${fixture.ofl?.channels.length ?? 0} mapped channels`
          : manualChannels.length > 1
            ? ` · channels ${fixture.startAddress}–${fixtureEndAddress(fixture)}`
            : manualChannels[0]?.name
              ? ` · ${manualChannels[0].name}`
              : t("fixtures.singleChannelDimmer")}
      </Typography>

      {outOfRange && (
        <Typography variant="caption" sx={{ m: 0, color: "warning.main" }}>
          {t("fixtures.extendsPast512")}
        </Typography>
      )}

      {conflicts.length > 0 && (
        <Typography variant="caption" sx={{ m: 0, color: "warning.main" }}>
          {t("fixtures.overlapsWith", { names: conflicts.map((other) => other.name).join(", ") })}
        </Typography>
      )}
    </Box>
  );
}
