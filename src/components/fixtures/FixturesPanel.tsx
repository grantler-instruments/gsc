import GridViewOutlinedIcon from "@mui/icons-material/GridViewOutlined";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { buildFixtureOflProfile, oflProfileChannelCount } from "../../lib/ofl/profile";
import { useProjectStore } from "../../stores/project";
import { useUiStore } from "../../stores/ui";
import type { Fixture } from "../../types/fixture";
import { AddFixtureMenu } from "../AddFixtureMenu";
import { OflBrowseDialog, type OflBrowseImportPayload } from "../OflBrowseDialog";
import { FixtureList } from "./FixtureList";
import { FixtureProfileImportDialog } from "./FixtureProfileImportDialog";
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
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [browseDialogOpen, setBrowseDialogOpen] = useState(false);

  const profileActions = useFixtureProfileActions(canEdit, fixtures, projectName, setExpandedId);

  const handleAddFixture = useCallback(() => {
    const fixture = addFixture();
    setExpandedId(fixture.id);
  }, [addFixture]);

  const handleFixtureUpdate = useCallback(
    (id: string, patch: Partial<Omit<Fixture, "id">>) => {
      updateFixture(id, patch);
    },
    [updateFixture],
  );

  const handleRemove = useCallback(
    (id: string) => {
      removeFixture(id);
      setExpandedId((current) => (current === id ? null : current));
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
      setExpandedId(fixture.id);
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
        {canEdit
          ? fixtures.length === 0
            ? t("fixtures.emptyHint")
            : t("fixtures.dropHint")
          : t("fixtures.showModeHint")}
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
          expandedId={expandedId}
          canEdit={canEdit}
          readOnly={!canEdit}
          onExpandedChange={setExpandedId}
          onUpdate={handleFixtureUpdate}
          onRemove={handleRemove}
        />

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

      <FixtureProfileImportDialog
        open={profileActions.importDialogOpen}
        profileName={profileActions.importDialogProfileName}
        importedCount={profileActions.importDialogFixtureCount}
        existingCount={fixtures.length}
        hasPlot={profileActions.importDialogHasPlot}
        onCancel={profileActions.handleImportCancel}
        onMerge={() => void profileActions.handleImportMerge()}
        onReplace={() => void profileActions.handleImportReplace()}
      />
    </Box>
  );
}
