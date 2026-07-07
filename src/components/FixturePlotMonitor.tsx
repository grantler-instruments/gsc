import CloseFullscreenIcon from "@mui/icons-material/CloseFullscreen";
import OpenInFullIcon from "@mui/icons-material/OpenInFull";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ensureFixtureInActiveLightCue,
  patchActiveLightCueFixturePosition,
  useActiveLightCueContext,
} from "../hooks/useActiveLightCueContext";
import type { FixturePositionDegrees } from "../lib/fixture-position";
import { getPlatform } from "../platform";
import { useProjectStore } from "../stores/project";
import { useUiStore } from "../stores/ui";
import { FixturePlotBackgroundControls } from "./FixturePlotBackgroundControls";
import { FixturePlotCanvas } from "./FixturePlotCanvas";

interface FixturePlotMonitorProps {
  editMode?: boolean;
  expanded?: boolean;
  onEditModeChange?: (open: boolean) => void;
}

export function FixturePlotMonitor({
  editMode: editModeProp,
  expanded = false,
  onEditModeChange,
}: FixturePlotMonitorProps) {
  const { t } = useTranslation();
  const showMode = useUiStore((s) => s.showMode);
  const fixturePlotEditMode = useUiStore((s) => s.fixturePlotEditMode);
  const setFixturePlotEditMode = useUiStore((s) => s.setFixturePlotEditMode);
  const fixturePlotExpanded = useUiStore((s) => s.fixturePlotExpanded);
  const toggleFixturePlotExpanded = useUiStore((s) => s.toggleFixturePlotExpanded);
  const inspectedFixtureId = useUiStore((s) => s.inspectedFixtureId);
  const setInspectedFixtureId = useUiStore((s) => s.setInspectedFixtureId);
  const setRightSidebarTab = useUiStore((s) => s.setRightSidebarTab);
  const setCompactInspectorDrawerOpen = useUiStore((s) => s.setCompactInspectorDrawerOpen);
  const syncFixturePlot = useProjectStore((s) => s.syncFixturePlot);
  const moveFixturePlotEntry = useProjectStore((s) => s.moveFixturePlotEntry);
  const updateCue = useProjectStore((s) => s.updateCue);
  const fixtures = useProjectStore((s) => s.fixtures);
  const lightCue = useActiveLightCueContext();
  const [layoutSelectedFixtureId, setLayoutSelectedFixtureId] = useState<string | null>(null);
  const plotContainerRef = useRef<HTMLDivElement>(null);

  const editMode = editModeProp ?? (fixturePlotEditMode && !showMode);
  const setEditMode =
    onEditModeChange ??
    ((open: boolean) => {
      setFixturePlotEditMode(open);
    });

  useEffect(() => {
    if (!inspectedFixtureId || editMode) return;
    plotContainerRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [editMode, inspectedFixtureId]);

  const dmxDisabled = getPlatform() !== "tauri";
  const canInteract = Boolean(lightCue.cue?.dmx) && !showMode;
  const canAim = canInteract && lightCue.editable && !dmxDisabled;

  const fixtureIdsInCue = useMemo(() => lightCue.fixtureIdsInCue, [lightCue.fixtureIdsInCue]);

  useEffect(() => {
    if (fixtures.length > 0) {
      syncFixturePlot();
    }
  }, [fixtures, syncFixturePlot]);

  useEffect(() => {
    if (!editMode) {
      setLayoutSelectedFixtureId(null);
      return;
    }
    setInspectedFixtureId(null);
  }, [editMode, setInspectedFixtureId]);

  useEffect(() => {
    setInspectedFixtureId(null);
  }, [lightCue.cue?.id, setInspectedFixtureId]);

  useEffect(() => {
    if (!editMode) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setEditMode(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [editMode, setEditMode]);

  const handleMoveEntry = useCallback(
    (fixtureId: string, x: number, y: number) => {
      moveFixturePlotEntry(fixtureId, x, y);
    },
    [moveFixturePlotEntry],
  );

  const handleInspectFixture = useCallback(
    (fixtureId: string) => {
      setInspectedFixtureId(fixtureId);
      setRightSidebarTab("cue");
      setCompactInspectorDrawerOpen(true);

      const fixture = fixtures.find((item) => item.id === fixtureId);
      if (!fixture || !lightCue.cue) return;

      const nextDmx = ensureFixtureInActiveLightCue(lightCue, fixture);
      if (nextDmx && nextDmx !== lightCue.cue.dmx) {
        updateCue(lightCue.cue.id, { dmx: nextDmx });
      }
    },
    [
      fixtures,
      lightCue,
      setCompactInspectorDrawerOpen,
      setInspectedFixtureId,
      setRightSidebarTab,
      updateCue,
    ],
  );

  const handleAimFixture = useCallback(
    (fixtureId: string, position: FixturePositionDegrees) => {
      const fixture = fixtures.find((item) => item.id === fixtureId);
      if (!fixture || !lightCue.cue) return;

      let dmx = lightCue.cue.dmx;
      if (!dmx) return;

      const ensured = ensureFixtureInActiveLightCue(lightCue, fixture);
      if (ensured) dmx = ensured;

      const nextDmx = patchActiveLightCueFixturePosition(
        { ...lightCue, cue: { ...lightCue.cue, dmx } },
        fixture,
        position,
      );
      if (nextDmx) {
        updateCue(lightCue.cue.id, { dmx: nextDmx });
      }
    },
    [fixtures, lightCue, updateCue],
  );

  if (fixtures.length === 0) {
    return null;
  }

  const hint = editMode
    ? t("fixtures.dragToReposition")
    : canInteract
      ? canAim
        ? t("fixtures.plotInspectAimHint")
        : t("fixtures.plotInspectHint")
      : null;

  return (
    <Box
      ref={plotContainerRef}
      sx={{
        display: "flex",
        flexDirection: "column",
        flexShrink: 0,
        borderBottom: 1,
        borderColor: "divider",
      }}
    >
      <Stack
        direction="row"
        sx={{
          alignItems: "center",
          justifyContent: "space-between",
          px: 1.5,
          py: 0.5,
          gap: 1,
        }}
      >
        <Typography variant="caption" color="text.secondary" sx={{ m: 0 }}>
          {t("fixtures.previewTitle")}
        </Typography>
        <Stack direction="row" sx={{ alignItems: "center", gap: 0.25 }}>
          {editMode ? (
            <Button
              size="small"
              variant="text"
              onClick={() => setEditMode(false)}
              sx={{ minWidth: 0, py: 0, px: 0.5, fontSize: 12 }}
            >
              {t("common.action.done")}
            </Button>
          ) : (
            !showMode && (
              <Button
                size="small"
                variant="text"
                onClick={() => setEditMode(true)}
                sx={{ minWidth: 0, py: 0, px: 0.5, fontSize: 12 }}
              >
                {t("common.action.edit")}
              </Button>
            )
          )}
          {!expanded && (
            <Tooltip
              title={
                fixturePlotExpanded ? t("common.action.collapse") : t("fixtures.expandAboveCueList")
              }
            >
              <IconButton
                size="small"
                aria-label={
                  fixturePlotExpanded
                    ? t("fixtures.collapsePreview")
                    : t("fixtures.expandAboveCueList")
                }
                onClick={toggleFixturePlotExpanded}
                sx={{ p: 0.25 }}
              >
                {fixturePlotExpanded ? (
                  <CloseFullscreenIcon sx={{ fontSize: 16 }} />
                ) : (
                  <OpenInFullIcon sx={{ fontSize: 16 }} />
                )}
              </IconButton>
            </Tooltip>
          )}
          {expanded && (
            <Tooltip title={t("common.action.collapse")}>
              <IconButton
                size="small"
                aria-label={t("fixtures.collapsePreview")}
                onClick={toggleFixturePlotExpanded}
                sx={{ p: 0.25 }}
              >
                <CloseFullscreenIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Tooltip>
          )}
        </Stack>
      </Stack>

      {editMode && <FixturePlotBackgroundControls />}

      <FixturePlotCanvas
        editMode={editMode}
        expanded={expanded}
        layoutSelectedFixtureId={layoutSelectedFixtureId}
        inspectedFixtureId={inspectedFixtureId}
        fixtureIdsInCue={fixtureIdsInCue}
        canInteract={canInteract}
        canAim={canAim}
        onLayoutSelectFixture={setLayoutSelectedFixtureId}
        onInspectFixture={handleInspectFixture}
        onClearInspect={() => setInspectedFixtureId(null)}
        onAimFixture={handleAimFixture}
        onMoveEntry={handleMoveEntry}
      />

      {hint && (
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ px: 1.5, py: 0.5, display: "block" }}
        >
          {hint}
        </Typography>
      )}
    </Box>
  );
}
