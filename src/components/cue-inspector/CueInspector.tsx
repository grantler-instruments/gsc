import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { getPrimarySelectedCueId } from "../../lib/cue-selection";
import { getPlatform } from "../../platform";
import { useActiveCueList, useProjectStore } from "../../stores/project";
import { useUiStore } from "../../stores/ui";
import { CueTypeBadge } from "../CueTypeIcon";
import { PanelHeader } from "../layout/PanelHeader";
import {
  inspectorFieldsSx,
  inspectorPanelEmptySx,
  inspectorPanelSx,
} from "../inspectorSx";
import { CueInspectorBody } from "./CueInspectorBody";

export function CueInspector() {
  const activeList = useActiveCueList();
  const updateCue = useProjectStore((s) => s.updateCue);
  const showMode = useUiStore((s) => s.showMode);
  const readOnly = showMode;
  const oscDisabled = getPlatform() !== "tauri";
  const oscReadOnly = readOnly || oscDisabled;

  const selectedCueId = getPrimarySelectedCueId(activeList.selectedCueIds);
  const cue = activeList.cues.find((c) => c.id === selectedCueId);

  if (!cue) {
    return (
      <Box component="aside" sx={inspectorPanelEmptySx}>
        <Typography variant="caption" color="text.secondary" sx={{ m: 0 }}>
          Select a cue to edit its properties.
        </Typography>
      </Box>
    );
  }

  return (
    <Box component="aside" sx={inspectorPanelSx}>
      <PanelHeader title={showMode ? "Inspector (view)" : "Inspector"}>
        <CueTypeBadge type={cue.type} />
      </PanelHeader>

      <Box sx={inspectorFieldsSx}>
        <CueInspectorBody
          cue={cue}
          cues={activeList.cues}
          readOnly={readOnly}
          oscReadOnly={oscReadOnly}
          oscDisabled={oscDisabled}
          onUpdate={(patch) => updateCue(cue.id, patch)}
        />
      </Box>
    </Box>
  );
}
