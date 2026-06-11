import GridViewOutlinedIcon from "@mui/icons-material/GridViewOutlined";
import LightbulbOutlinedIcon from "@mui/icons-material/LightbulbOutlined";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { tryGetActiveProjectId } from "../lib/active-project-id";
import { getCachedAsset } from "../lib/asset-cache";
import {
  buildFixturesProfileZip,
  downloadFixturesProfile,
  FIXTURES_PROFILE_EXTENSION,
  hydrateFixtureProfiles,
  parseFixturesProfileZip,
  prepareFixturesProfileImport,
} from "../lib/fixture-profile";
import {
  addManualFixtureChannel,
  clampStartAddress,
  clampUniverse,
  fixtureChannelAddress,
  fixtureEndAddress,
  fixtureFitsInUniverse,
  formatFixtureListDetail,
  formatFixturePatch,
  getFixtureConflicts,
  manualFixtureChannels,
  removeManualFixtureChannel,
  updateManualFixtureChannelName,
} from "../lib/fixtures";
import { notifyErrorFromUnknown } from "../lib/notifications";
import { collectOflPaths } from "../lib/ofl/import-ofl";
import { loadFixtureOflProfileForMode, loadOflSummaryFromPath } from "../lib/ofl/load-ofl";
import { buildFixtureOflProfile, oflProfileChannelCount } from "../lib/ofl/profile";
import { useProjectStore } from "../stores/project";
import { useUiStore } from "../stores/ui";
import { useVfsStore } from "../stores/vfs";
import { useGscTokens } from "../theme/useGscTokens";
import type { Fixture } from "../types/fixture";
import { vfsGet } from "../vfs/engine";
import { AddFixtureMenu } from "./AddFixtureMenu";
import { inspectorFieldLabelSx, inspectorFieldSx } from "./inspectorSx";
import { OflBrowseDialog, type OflBrowseImportPayload } from "./OflBrowseDialog";

const emptyListSx = {
  py: 2,
  px: 1.5,
  color: "text.secondary",
  fontSize: 13,
} as const;

export function FixturesPanel() {
  const { t } = useTranslation();
  const tokens = useGscTokens();
  const showMode = useUiStore((s) => s.showMode);
  const setSidebarTab = useUiStore((s) => s.setSidebarTab);
  const setFixturePlotEditMode = useUiStore((s) => s.setFixturePlotEditMode);
  const canEdit = !showMode;
  const fixtures = useProjectStore((s) => s.fixtures);
  const projectName = useProjectStore((s) => s.name);
  const addFixture = useProjectStore((s) => s.addFixture);
  const appendFixtures = useProjectStore((s) => s.appendFixtures);
  const removeFixture = useProjectStore((s) => s.removeFixture);
  const updateFixture = useProjectStore((s) => s.updateFixture);
  const syncVfsFromEngine = useVfsStore((s) => s.syncFromEngine);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [browseDialogOpen, setBrowseDialogOpen] = useState(false);
  const profileImportRef = useRef<HTMLInputElement>(null);

  const selectedFixture = useMemo(
    () => fixtures.find((fixture) => fixture.id === selectedId) ?? null,
    [fixtures, selectedId],
  );

  const existingOflPaths = useMemo(() => collectOflPaths(fixtures), [fixtures]);

  const existingProfilePaths = useMemo(() => existingOflPaths, [existingOflPaths]);

  const readProfileBlob = useCallback(async (path: string) => {
    const fromVfs = vfsGet(path);
    if (fromVfs) return fromVfs;
    const projectId = tryGetActiveProjectId();
    if (!projectId) return undefined;
    return getCachedAsset(projectId, path);
  }, []);

  const handleExportProfile = useCallback(async () => {
    if (!canEdit) return;
    try {
      const { zip, missing } = await buildFixturesProfileZip(fixtures, readProfileBlob);
      if (missing.length > 0) {
        throw new Error(t("fixtures.missingProfiles", { count: missing.length }));
      }
      downloadFixturesProfile(zip, `${projectName}-fixtures`);
    } catch (err) {
      notifyErrorFromUnknown(err);
    }
  }, [canEdit, fixtures, projectName, readProfileBlob, t]);

  const handleImportProfileClick = useCallback(() => {
    profileImportRef.current?.click();
  }, []);

  const handleImportProfileFile = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      event.target.value = "";
      if (!file || !canEdit) return;

      try {
        const data = new Uint8Array(await file.arrayBuffer());
        const { snapshot, profiles } = parseFixturesProfileZip(data);
        const prepared = prepareFixturesProfileImport(
          snapshot,
          profiles,
          fixtures,
          existingProfilePaths,
        );
        await hydrateFixtureProfiles(prepared.profiles);
        appendFixtures(prepared.fixtures);
        syncVfsFromEngine();
        if (prepared.fixtures[0]) {
          setSelectedId(prepared.fixtures[0].id);
        }
      } catch (err) {
        notifyErrorFromUnknown(err);
      }
    },
    [appendFixtures, canEdit, existingProfilePaths, fixtures, syncVfsFromEngine],
  );

  const handleAddFixture = useCallback(() => {
    const fixture = addFixture();
    setSelectedId(fixture.id);
  }, [addFixture]);

  const handleFixtureUpdate = useCallback(
    (id: string, patch: Partial<Omit<Fixture, "id">>) => {
      updateFixture(id, patch);
    },
    [updateFixture],
  );

  const handleSelect = useCallback((fixture: Fixture) => {
    setSelectedId(fixture.id);
  }, []);

  const handleRemove = useCallback(
    (id: string) => {
      removeFixture(id);
      setSelectedId((current) => (current === id ? null : current));
    },
    [removeFixture],
  );

  const handleBrowseImported = useCallback(
    (payload: OflBrowseImportPayload) => {
      const profile = buildFixtureOflProfile(payload.path, payload.summary, payload.mode);
      const fixture = addFixture({
        name: `${profile.manufacturer} ${profile.model}`.trim(),
        channelCount: oflProfileChannelCount(profile),
        ofl: profile,
      });
      setSelectedId(fixture.id);
    },
    [addFixture],
  );

  return (
    <Box
      sx={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
        overflow: "hidden",
      }}
    >
      <Typography variant="caption" sx={{ px: 1.5, py: 1, m: 0, flexShrink: 0 }}>
        {canEdit ? t("fixtures.dropHint") : t("fixtures.showModeHint")}
      </Typography>

      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Box
          component="ul"
          sx={{
            listStyle: "none",
            m: 0,
            py: 0.5,
            px: 0,
            flexShrink: 0,
          }}
        >
          {fixtures.length === 0 && (
            <Box component="li" sx={emptyListSx}>
              {t("fixtures.empty")}
            </Box>
          )}
          {fixtures.map((fixture) => {
            const conflicts = getFixtureConflicts(fixture, fixtures);
            const selected = fixture.id === selectedId;
            return (
              <Box
                component="li"
                key={fixture.id}
                onClick={() => handleSelect(fixture)}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  py: 0.75,
                  px: 1.5,
                  borderBottom: 1,
                  borderColor: "divider",
                  cursor: "pointer",
                  bgcolor: selected ? tokens.bgHover : "transparent",
                  "&:hover": { bgcolor: tokens.bgHover },
                }}
              >
                <Box
                  component="span"
                  sx={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 24,
                    height: 24,
                    borderRadius: 1,
                    bgcolor: "background.default",
                    color: "primary.main",
                    flexShrink: 0,
                  }}
                >
                  <LightbulbOutlinedIcon sx={{ fontSize: 16 }} aria-hidden />
                </Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography
                    component="span"
                    noWrap
                    title={fixture.name}
                    sx={{ display: "block", fontSize: 13 }}
                  >
                    {fixture.name}
                  </Typography>
                  <Typography
                    component="span"
                    noWrap
                    sx={{
                      display: "block",
                      fontSize: 11,
                      color: conflicts.length > 0 ? "warning.main" : "text.secondary",
                    }}
                  >
                    {formatFixtureListDetail(fixture)}
                    {conflicts.length > 0 ? t("fixtures.addressConflict") : ""}
                  </Typography>
                </Box>
                {canEdit && (
                  <IconButton
                    size="small"
                    title={t("fixtures.removeFixture")}
                    onClick={(event) => {
                      event.stopPropagation();
                      handleRemove(fixture.id);
                    }}
                  >
                    ×
                  </IconButton>
                )}
              </Box>
            );
          })}
        </Box>

        {selectedFixture && (
          <FixtureEditor
            fixture={selectedFixture}
            fixtures={fixtures}
            readOnly={!canEdit}
            onUpdate={(patch) => handleFixtureUpdate(selectedFixture.id, patch)}
          />
        )}

        {fixtures.length > 0 && (
          <Box sx={{ px: 1.5, py: 1, flexShrink: 0, borderTop: 1, borderColor: "divider" }}>
            <Button
              fullWidth
              variant="outlined"
              startIcon={<GridViewOutlinedIcon />}
              onClick={() => {
                if (canEdit) {
                  setFixturePlotEditMode(true);
                }
                setSidebarTab("active");
              }}
            >
              {canEdit ? t("fixtures.editPreview") : t("fixtures.viewPreview")}
            </Button>
          </Box>
        )}
      </Box>

      {canEdit && (
        <Box
          component="footer"
          sx={{
            display: "flex",
            alignItems: "center",
            px: 1.5,
            py: 1,
            borderTop: 1,
            borderColor: "divider",
            flexShrink: 0,
            bgcolor: "background.paper",
          }}
        >
          <AddFixtureMenu
            dropUp
            fullWidth
            onAddGeneric={handleAddFixture}
            onBrowseOfl={() => setBrowseDialogOpen(true)}
            onExportProfile={() => void handleExportProfile()}
            onImportProfile={handleImportProfileClick}
          />
        </Box>
      )}

      <OflBrowseDialog
        open={browseDialogOpen}
        existingPaths={existingOflPaths}
        onClose={() => setBrowseDialogOpen(false)}
        onImported={handleBrowseImported}
      />

      <input
        ref={profileImportRef}
        type="file"
        accept={`${FIXTURES_PROFILE_EXTENSION},application/zip`}
        hidden
        onChange={handleImportProfileFile}
      />
    </Box>
  );
}

interface FixtureEditorProps {
  fixture: Fixture;
  fixtures: Fixture[];
  readOnly: boolean;
  onUpdate: (patch: Partial<Omit<Fixture, "id">>) => void;
}

function FixtureEditor({ fixture, fixtures, readOnly, onUpdate }: FixtureEditorProps) {
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

interface FixtureNumberFieldProps {
  label: string;
  value: number;
  min?: number;
  max?: number;
  readOnly: boolean;
  onCommit: (value: number) => void;
}

function FixtureNumberField({
  label,
  value,
  min,
  max,
  readOnly,
  onCommit,
}: FixtureNumberFieldProps) {
  const [draft, setDraft] = useState(String(value));

  useEffect(() => {
    setDraft(String(value));
  }, [value]);

  const commitDraft = () => {
    const parsed = Number(draft);
    if (!Number.isFinite(parsed)) {
      setDraft(String(value));
      return;
    }
    onCommit(parsed);
  };

  return (
    <Box component="label" sx={{ ...inspectorFieldSx, flex: 1 }}>
      <Typography component="span" sx={inspectorFieldLabelSx}>
        {label}
      </Typography>
      <input
        type="number"
        min={min}
        max={max}
        value={draft}
        readOnly={readOnly}
        onChange={(event) => setDraft(event.currentTarget.value)}
        onBlur={readOnly ? undefined : commitDraft}
        onKeyDown={
          readOnly
            ? undefined
            : (event) => {
                if (event.key === "Enter") {
                  event.currentTarget.blur();
                }
              }
        }
      />
    </Box>
  );
}
