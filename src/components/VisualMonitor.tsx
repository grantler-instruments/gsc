import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useVisualOutputPreviews } from "../hooks/useVisualOutputPreviews";
import { useTransportStore } from "../stores/transport";
import { OutputImperativeStage } from "./OutputImperativeStage";
import { visualStageEmptySx } from "./visualStageSx";

interface VisualMonitorProps {
  /** Sidebar layout: 16:9 stage that sizes to panel width. */
  variant?: "default" | "sidebar";
}

function previewDestinationKey(busId: string | undefined): string {
  return busId ?? "master";
}

/** Live multiview preview — one monitor tile per output window. */
export function VisualMonitor({ variant = "default" }: VisualMonitorProps) {
  const { t } = useTranslation();
  const destinations = useVisualOutputPreviews();
  const stopCue = useTransportStore((s) => s.stopCue);
  const sidebar = variant === "sidebar";

  const handleVideoEnded = useCallback(
    (cueId: string) => {
      stopCue(cueId);
    },
    [stopCue],
  );

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
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ px: 1.5, py: 0.5, display: "block" }}
        title={t("output.previewHint")}
      >
        {t("output.preview")}
      </Typography>

      <Box
        sx={{
          display: "flex",
          flexDirection: sidebar ? "column" : "row",
          flexWrap: sidebar ? "nowrap" : "wrap",
          gap: 1,
          px: 1,
          pb: 1,
          maxHeight: sidebar ? 420 : undefined,
          overflowY: sidebar ? "auto" : undefined,
        }}
      >
        {destinations.map((destination) => (
          <Box
            key={previewDestinationKey(destination.busId)}
            sx={{
              minWidth: 0,
              flex: sidebar ? "0 0 auto" : "1 1 160px",
              width: sidebar ? "100%" : undefined,
              maxWidth: sidebar ? "100%" : 280,
            }}
          >
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{
                px: 0.5,
                pb: 0.25,
                display: "block",
                fontWeight: 700,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {destination.busName}
            </Typography>
            <Box
              sx={{
                position: "relative",
                aspectRatio: "16 / 9",
                height: sidebar ? "auto" : 120,
                minHeight: sidebar ? 0 : 120,
                bgcolor: "#000",
                overflow: "hidden",
              }}
            >
              {destination.layers.length === 0 && (
                <Typography component="span" sx={visualStageEmptySx}>
                  {t("output.noActiveVisualCues")}
                </Typography>
              )}
              <OutputImperativeStage
                layers={destination.layers}
                busEffects={destination.busEffects}
                busOpacity={destination.busOpacity}
                outputFrame={destination.outputFrame}
                registerStage={false}
                onVideoEnded={handleVideoEnded}
              />
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
