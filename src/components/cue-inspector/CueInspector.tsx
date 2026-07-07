import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";
import { getPrimarySelectedCueId } from "../../lib/cue-selection";
import { getPlatform } from "../../platform";
import { useActiveCueList, useProjectStore } from "../../stores/project";
import { useUiStore } from "../../stores/ui";
import { CueTypeBadge } from "../CueTypeIcon";
import { inspectorFieldsSx, inspectorPanelEmptySx, inspectorPanelSx } from "../inspectorSx";
import { PanelHeader } from "../layout/PanelHeader";
import { CueInspectorBody } from "./CueInspectorBody";

export function CueInspector() {
  const { t } = useTranslation();
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
      <Box component="aside" sx={inspectorPanelEmptySx}>
        <Typography variant="caption" color="text.secondary" sx={{ m: 0 }}>
          {t("inspector.emptyState")}
        </Typography>
      </Box>
    );
  }

  return (
    <Box component="aside" sx={inspectorPanelSx}>
      <PanelHeader title={showMode ? t("inspector.titleView") : t("inspector.title")}>
        <CueTypeBadge type={cue.type} />
      </PanelHeader>

      <Box
        sx={{
          ...inspectorFieldsSx,
          flex: 1,
          minHeight: 0,
          overflow: "hidden",
          gap: 0,
          display: "flex",
          flexDirection: "column",
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
    </Box>
  );
}
