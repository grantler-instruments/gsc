import GridViewOutlinedIcon from "@mui/icons-material/GridViewOutlined";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { buildFixtureOflProfile, oflProfileChannelCount } from "../../lib/ofl/profile";
import { useProjectStore } from "../../stores/project";
import { useUiStore } from "../../stores/ui";
import type { Fixture } from "../../types/fixture";
import { AddFixtureMenu } from "../AddFixtureMenu";
import { OflBrowseDialog, type OflBrowseImportPayload } from "../OflBrowseDialog";
import { FixtureEditor } from "./FixtureEditor";
import { FixtureList } from "./FixtureList";
import { useFixtureProfileActions } from "./useFixtureProfileActions";

export function FixturesPanel() {
  const { t } = useTranslation();
  const showMode = useUiStore((s) => s.showMode);
  const setSidebarTab = useUiStore((s) => s.setSidebarTab);
  const setFixturePlotEditMode = useUiStore((s) => s.setFixturePlotEditMode);
  const canEdit = !showMode;
  const fixtures = useProjectStore((s) => s.fixtures);
  const projectName = useProjectStore((s) => s.name);
  const addFixture = useProjectStore((s) => s.addFixture);
  const removeFixture = useProjectStore((s) => s.removeFixture);
  const updateFixture = useProjectStore((s) => s.updateFixture);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [browseDialogOpen, setBrowseDialogOpen] = useState(false);

  const selectedFixture = useMemo(
    () => fixtures.find((fixture) => fixture.id === selectedId) ?? null,
    [fixtures, selectedId],
  );

  const profileActions = useFixtureProfileActions(canEdit, fixtures, projectName, setSelectedId);

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
        <FixtureList
          fixtures={fixtures}
          selectedId={selectedId}
          canEdit={canEdit}
          onSelect={handleSelect}
          onRemove={handleRemove}
        />

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
            bgcolor: "background.default",
          }}
        >
          <AddFixtureMenu
            dropUp
            fullWidth
            onAddGeneric={handleAddFixture}
            onBrowseOfl={() => setBrowseDialogOpen(true)}
            onExportProfile={() => void profileActions.handleExportProfile()}
            onImportProfile={profileActions.handleImportProfileClick}
          />
        </Box>
      )}

      <OflBrowseDialog
        open={browseDialogOpen}
        existingPaths={profileActions.existingOflPaths}
        onClose={() => setBrowseDialogOpen(false)}
        onImported={handleBrowseImported}
      />

      <input
        ref={profileActions.profileImportRef}
        type="file"
        accept={profileActions.profileImportAccept}
        hidden
        onChange={profileActions.handleImportProfileFile}
      />
    </Box>
  );
}
