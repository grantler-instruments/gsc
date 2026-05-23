import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useCallback, useEffect, useState } from "react";
import { useProjectStore } from "../stores/project";
import { useUiStore } from "../stores/ui";
import { FixturePlotCanvas } from "./FixturePlotCanvas";

interface FixturePlotMonitorProps {
  editMode?: boolean;
  onEditModeChange?: (open: boolean) => void;
}

export function FixturePlotMonitor({
  editMode: editModeProp,
  onEditModeChange,
}: FixturePlotMonitorProps) {
  const showMode = useUiStore((s) => s.showMode);
  const fixturePlotEditMode = useUiStore((s) => s.fixturePlotEditMode);
  const setFixturePlotEditMode = useUiStore((s) => s.setFixturePlotEditMode);
  const syncFixturePlot = useProjectStore((s) => s.syncFixturePlot);
  const moveFixturePlotEntry = useProjectStore((s) => s.moveFixturePlotEntry);
  const fixtures = useProjectStore((s) => s.fixtures);
  const [selectedFixtureId, setSelectedFixtureId] = useState<string | null>(null);

  const editMode =
    editModeProp ?? (fixturePlotEditMode && !showMode);
  const setEditMode =
    onEditModeChange ??
    ((open: boolean) => {
      setFixturePlotEditMode(open);
    });

  useEffect(() => {
    if (fixtures.length > 0) {
      syncFixturePlot();
    }
  }, [fixtures, syncFixturePlot]);

  useEffect(() => {
    if (!editMode) {
      setSelectedFixtureId(null);
    }
  }, [editMode]);

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

  if (fixtures.length === 0) {
    return null;
  }

  return (
    <Box
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
          Fixture preview
        </Typography>
        {editMode ? (
          <Button
            size="small"
            variant="text"
            onClick={() => setEditMode(false)}
            sx={{ minWidth: 0, py: 0, px: 0.5, fontSize: 12 }}
          >
            Done
          </Button>
        ) : (
          !showMode && (
            <Button
              size="small"
              variant="text"
              onClick={() => setEditMode(true)}
              sx={{ minWidth: 0, py: 0, px: 0.5, fontSize: 12 }}
            >
              Edit
            </Button>
          )
        )}
      </Stack>

      <FixturePlotCanvas
        editMode={editMode}
        selectedFixtureId={selectedFixtureId}
        onSelectFixture={setSelectedFixtureId}
        onMoveEntry={handleMoveEntry}
      />

      {editMode && (
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ px: 1.5, py: 0.5, display: "block" }}
        >
          Drag fixtures to reposition. Press Done or Esc when finished.
        </Typography>
      )}
    </Box>
  );
}
