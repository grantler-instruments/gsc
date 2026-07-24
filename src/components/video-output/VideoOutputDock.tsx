import CloseIcon from "@mui/icons-material/Close";
import OndemandVideoOutlinedIcon from "@mui/icons-material/OndemandVideoOutlined";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useVisualOutputPreviews } from "../../hooks/useVisualOutputPreviews";
import { DEFAULT_VIDEO_OUTPUT_DOCK_HEIGHT } from "../../lib/video-output-layout";
import { useProjectStore } from "../../stores/project";
import { useUiStore } from "../../stores/ui";
import { DockResizeHandle } from "./DockResizeHandle";
import { DestinationOutputStrip, MasterProgramStrip, ProgramBusStrip } from "./VideoOutputStrip";

const sectionLabelSx = {
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: "0.06em",
  color: "text.secondary",
  textTransform: "uppercase",
  display: "block",
  mb: 0.5,
} as const;

const sectionColumnSx = {
  flexShrink: 0,
  height: "100%",
  display: "flex",
  flexDirection: "column",
} as const;

const sectionRowSx = {
  flex: 1,
  minHeight: 0,
  display: "flex",
  alignItems: "stretch",
} as const;

export function VideoOutputDock() {
  const { t } = useTranslation();
  const showMode = useUiStore((s) => s.showMode);
  const setVideoOutputOpen = useUiStore((s) => s.setVideoOutputOpen);
  const videoOutputHeight = useUiStore((s) => s.videoOutputHeight);
  const setVideoOutputHeight = useUiStore((s) => s.setVideoOutputHeight);
  const canEdit = !showMode;
  const videoBuses = useProjectStore((s) => s.videoBuses);
  const videoOutputs = useProjectStore((s) => s.videoOutputs);
  const addVideoBus = useProjectStore((s) => s.addVideoBus);
  const updateVideoBus = useProjectStore((s) => s.updateVideoBus);
  const removeVideoBus = useProjectStore((s) => s.removeVideoBus);
  const addVideoBusEffect = useProjectStore((s) => s.addVideoBusEffect);
  const updateVideoBusEffect = useProjectStore((s) => s.updateVideoBusEffect);
  const removeVideoBusEffect = useProjectStore((s) => s.removeVideoBusEffect);
  const reorderVideoBusEffectRelative = useProjectStore((s) => s.reorderVideoBusEffectRelative);
  const addVideoOutput = useProjectStore((s) => s.addVideoOutput);
  const updateVideoOutput = useProjectStore((s) => s.updateVideoOutput);
  const removeVideoOutput = useProjectStore((s) => s.removeVideoOutput);
  const previewDestinations = useVisualOutputPreviews();

  const previewForOutput = useCallback(
    (outputId: string) => previewDestinations.find((d) => d.outputId === outputId),
    [previewDestinations],
  );

  const handleAddBus = useCallback(() => {
    addVideoBus();
  }, [addVideoBus]);

  const handleAddOutput = useCallback(() => {
    addVideoOutput({ kind: "window" });
  }, [addVideoOutput]);

  const handleResize = useCallback(
    (nextHeight: number) => {
      setVideoOutputHeight(nextHeight);
    },
    [setVideoOutputHeight],
  );

  return (
    <Box
      sx={{
        height: videoOutputHeight,
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
        bgcolor: "background.paper",
        minWidth: 0,
      }}
    >
      <DockResizeHandle height={videoOutputHeight} onResize={handleResize} />

      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Stack
          direction="row"
          sx={{
            alignItems: "center",
            gap: 1,
            px: 1.5,
            py: 0.75,
            borderBottom: 1,
            borderColor: "divider",
            flexShrink: 0,
          }}
        >
          <OndemandVideoOutlinedIcon fontSize="small" color="primary" aria-hidden />
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="subtitle2" sx={{ m: 0 }}>
              {t("videoOutput.title")}
            </Typography>
            {!showMode && (
              <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                {t("videoOutput.hintShort")}
              </Typography>
            )}
            {showMode && (
              <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                {t("videoOutput.showModeHint")}
              </Typography>
            )}
          </Box>
          <IconButton
            size="small"
            title={t("videoOutput.close")}
            aria-label={t("videoOutput.close")}
            onClick={() => setVideoOutputOpen(false)}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </Stack>

        <Box
          sx={{
            flex: 1,
            minHeight: 0,
            display: "flex",
            alignItems: "stretch",
            justifyContent: "flex-start",
            overflow: "auto",
            minWidth: 0,
            px: 1,
            py: 1,
          }}
        >
          <Box sx={sectionColumnSx}>
            <Typography variant="caption" sx={sectionLabelSx}>
              {t("videoOutput.program")}
            </Typography>
            <Box sx={sectionRowSx}>
              <MasterProgramStrip />
              {videoBuses.map((bus) => (
                <ProgramBusStrip
                  key={bus.id}
                  bus={bus}
                  canEdit={canEdit}
                  onUpdate={(patch) => updateVideoBus(bus.id, patch)}
                  onRemove={() => removeVideoBus(bus.id)}
                  onAddEffect={(type) => addVideoBusEffect(bus.id, type)}
                  onUpdateEffect={(effectId, patch) =>
                    updateVideoBusEffect(bus.id, effectId, patch)
                  }
                  onRemoveEffect={(effectId) => removeVideoBusEffect(bus.id, effectId)}
                  onReorderEffect={(draggedId, targetId, place) =>
                    reorderVideoBusEffectRelative(bus.id, draggedId, targetId, place)
                  }
                />
              ))}
              {canEdit && (
                <Box sx={{ flexShrink: 0, display: "flex", alignItems: "center" }}>
                  <Button size="small" variant="text" onClick={handleAddBus}>
                    {t("videoOutput.addBus")}
                  </Button>
                </Box>
              )}
            </Box>
          </Box>

          <Divider orientation="vertical" flexItem sx={{ mx: 1.5 }} />

          <Box sx={sectionColumnSx}>
            <Typography variant="caption" sx={sectionLabelSx}>
              {t("videoOutput.destination")}
            </Typography>
            <Box sx={sectionRowSx}>
              {videoOutputs.map((output) => (
                <DestinationOutputStrip
                  key={output.id}
                  output={output}
                  buses={videoBuses}
                  preview={previewForOutput(output.id)}
                  canEdit={canEdit}
                  onUpdate={(patch) => updateVideoOutput(output.id, patch)}
                  onRemove={() => removeVideoOutput(output.id)}
                />
              ))}
              {canEdit && (
                <Box sx={{ flexShrink: 0, display: "flex", alignItems: "center" }}>
                  <Button size="small" variant="text" onClick={handleAddOutput}>
                    {t("videoOutput.addOutput")}
                  </Button>
                </Box>
              )}
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

export const videoOutputDockHeight = DEFAULT_VIDEO_OUTPUT_DOCK_HEIGHT;
