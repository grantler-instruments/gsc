import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import { useCallback } from "react";
import { findCueInLists } from "../../lib/cue-lists";
import { getPrimarySelectedCueId } from "../../lib/cue-selection";
import { triggerStopCue } from "../../lib/trigger";
import { getActiveCueListFromState, useProjectStore } from "../../stores/project";
import { useTransportStore } from "../../stores/transport";
import { FixturePlotMonitor } from "../FixturePlotMonitor";
import { VisualMonitor } from "../VisualMonitor";
import { ActiveCueRow } from "./ActiveCueRow";
import { activeCuesEmptyListSx } from "./activeCuesSx";
import { useActivePlaybackCues } from "./useActivePlaybackCues";

export function ActiveCuesPanel() {
  const cueLists = useProjectStore((s) => s.cueLists);
  const selectedCueId = useProjectStore((s) =>
    getPrimarySelectedCueId(getActiveCueListFromState(s).selectedCueIds),
  );
  const selectCue = useProjectStore((s) => s.selectCue);
  const fixtures = useProjectStore((s) => s.fixtures);
  const activeCueId = useTransportStore((s) => s.activeCueId);
  const stopMany = useTransportStore((s) => s.stopMany);
  const stop = useTransportStore((s) => s.stop);
  const activeCues = useActivePlaybackCues();

  const handleStopCue = useCallback(
    (cueId: string) => {
      const found = findCueInLists(cueLists, cueId);
      if (!found) return;
      triggerStopCue(found.cue, found.list.cues, stopMany);
    },
    [cueLists, stopMany],
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
      <VisualMonitor variant="sidebar" />
      {fixtures.length > 0 && <FixturePlotMonitor />}

      {activeCues.length > 0 && (
        <Stack
          direction="row"
          sx={{
            justifyContent: "flex-end",
            px: 1,
            py: 0.75,
            borderBottom: 1,
            borderColor: "divider",
            flexShrink: 0,
          }}
        >
          <Button variant="text" size="small" onClick={stop}>
            Stop all
          </Button>
        </Stack>
      )}

      <Box
        component="ul"
        sx={{
          listStyle: "none",
          m: 0,
          p: 0,
          overflowY: "auto",
          flex: 1,
        }}
      >
        {activeCues.length === 0 && (
          <Box component="li" sx={activeCuesEmptyListSx}>
            No active cues. Press GO to run the selected cue.
          </Box>
        )}
        {activeCues.map((cue) => (
          <ActiveCueRow
            key={cue.id}
            cue={cue}
            isPrimary={cue.id === activeCueId}
            selected={cue.id === selectedCueId}
            onSelect={() => selectCue(cue.id)}
            onStop={() => handleStopCue(cue.id)}
          />
        ))}
      </Box>
    </Box>
  );
}
