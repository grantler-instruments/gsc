import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";
import { getPrimarySelectedCueId } from "../../lib/cue-selection";
import { getPlatform } from "../../platform";
import { useActiveCueList, useProjectStore } from "../../stores/project";
import { useUiStore } from "../../stores/ui";
import { CueTypeBadge } from "../CueTypeIcon";
import { inspectorFieldsSx } from "../inspectorSx";
import { PanelHeader } from "../layout/PanelHeader";
import { CueInspectorBody } from "./CueInspectorBody";

export function CueInspectorPanel() {
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
      <>
        <PanelHeader title={t("inspector.cueTitle")} />
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
            {t("inspector.emptyState")}
          </Typography>
        </Box>
      </>
    );
  }

  return (
    <>
      <PanelHeader title={showMode ? t("inspector.cueTitleView") : t("inspector.cueTitle")}>
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
    </>
  );
}
