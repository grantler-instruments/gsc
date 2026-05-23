import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { getPrimarySelectedCueId } from "../../lib/cue-selection";
import { getPlatform } from "../../platform";
import { useActiveCueList, useProjectStore } from "../../stores/project";
import { useUiStore } from "../../stores/ui";
import { CueTypeBadge } from "../CueTypeIcon";
import { PanelHeader } from "../layout/PanelHeader";
import { inspectorFieldsSx } from "../inspectorSx";
import { CueInspectorBody } from "./CueInspectorBody";

export function CueInspectorPanel() {
  const activeList = useActiveCueList();
  const updateCue = useProjectStore((s) => s.updateCue);
  const showMode = useUiStore((s) => s.showMode);
  const readOnly = showMode;
  const oscDisabled = getPlatform() !== "tauri";
  const oscReadOnly = readOnly || oscDisabled;
  const dmxDisabled = getPlatform() !== "tauri";
  const dmxReadOnly = readOnly || dmxDisabled;

  const selectedCueId = getPrimarySelectedCueId(activeList.selectedCueIds);
  const cue = activeList.cues.find((c) => c.id === selectedCueId);

  if (!cue) {
    return (
      <>
        <PanelHeader title="Cue" />
        <Box
          sx={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            p: 3,
          }}
        >
          <Typography variant="caption" color="text.secondary" sx={{ m: 0 }}>
            Select a cue to edit its properties.
          </Typography>
        </Box>
      </>
    );
  }

  const isLightInspector = cue.type === "dmx" || cue.type === "lightFade";

  return (
    <>
      <PanelHeader title={showMode ? "Cue (view)" : "Cue"}>
        <CueTypeBadge type={cue.type} />
      </PanelHeader>

      <Box
        sx={{
          ...inspectorFieldsSx,
          flex: 1,
          minHeight: 0,
          overflow: isLightInspector ? "hidden" : "auto",
          ...(isLightInspector && {
            display: "flex",
            flexDirection: "column",
          }),
        }}
      >
        <CueInspectorBody
          cue={cue}
          cues={activeList.cues}
          readOnly={readOnly}
          oscReadOnly={oscReadOnly}
          oscDisabled={oscDisabled}
          dmxReadOnly={dmxReadOnly}
          dmxDisabled={dmxDisabled}
          onUpdate={(patch) => updateCue(cue.id, patch)}
        />
      </Box>
    </>
  );
}
