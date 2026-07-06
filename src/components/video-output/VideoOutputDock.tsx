import CloseIcon from "@mui/icons-material/Close";
import OndemandVideoOutlinedIcon from "@mui/icons-material/OndemandVideoOutlined";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
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
import { MasterOutputStrip, OutputStrip } from "./VideoOutputStrip";

export function VideoOutputDock() {
  const { t } = useTranslation();
  const showMode = useUiStore((s) => s.showMode);
  const setVideoOutputOpen = useUiStore((s) => s.setVideoOutputOpen);
  const videoOutputHeight = useUiStore((s) => s.videoOutputHeight);
  const setVideoOutputHeight = useUiStore((s) => s.setVideoOutputHeight);
  const canEdit = !showMode;
  const videoBuses = useProjectStore((s) => s.videoBuses);
  const addVideoBus = useProjectStore((s) => s.addVideoBus);
  const updateVideoBus = useProjectStore((s) => s.updateVideoBus);
  const removeVideoBus = useProjectStore((s) => s.removeVideoBus);
  const addVideoBusEffect = useProjectStore((s) => s.addVideoBusEffect);
  const updateVideoBusEffect = useProjectStore((s) => s.updateVideoBusEffect);
  const removeVideoBusEffect = useProjectStore((s) => s.removeVideoBusEffect);
  const reorderVideoBusEffectRelative = useProjectStore((s) => s.reorderVideoBusEffectRelative);
  const previewDestinations = useVisualOutputPreviews();

  const previewForBus = useCallback(
    (busId: string | undefined) => previewDestinations.find((d) => d.busId === busId),
    [previewDestinations],
  );

  const handleAddBus = useCallback(() => {
    addVideoBus();
  }, [addVideoBus]);

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

        <Box sx={{ flex: 1, minHeight: 0, display: "flex", minWidth: 0 }}>
          <Box
            sx={{
              flex: 1,
              minWidth: 0,
              display: "flex",
              alignItems: "stretch",
              justifyContent: "flex-start",
              overflow: "auto",
              px: 1,
              py: 1,
            }}
          >
            <MasterOutputStrip preview={previewForBus(undefined)} />
            {videoBuses.map((bus) => (
              <OutputStrip
                key={bus.id}
                bus={bus}
                preview={previewForBus(bus.id)}
                canEdit={canEdit}
                onUpdate={(patch) => updateVideoBus(bus.id, patch)}
                onRemove={() => removeVideoBus(bus.id)}
                onAddEffect={(type) => addVideoBusEffect(bus.id, type)}
                onUpdateEffect={(effectId, patch) => updateVideoBusEffect(bus.id, effectId, patch)}
                onRemoveEffect={(effectId) => removeVideoBusEffect(bus.id, effectId)}
                onReorderEffect={(draggedId, targetId, place) =>
                  reorderVideoBusEffectRelative(bus.id, draggedId, targetId, place)
                }
              />
            ))}
          </Box>

          {canEdit && (
            <Box
              sx={{
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                px: 1,
                borderLeft: 1,
                borderColor: "divider",
              }}
            >
              <Button size="small" variant="text" onClick={handleAddBus}>
                {t("videoOutput.addBus")}
              </Button>
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
}

export const videoOutputDockHeight = DEFAULT_VIDEO_OUTPUT_DOCK_HEIGHT;
