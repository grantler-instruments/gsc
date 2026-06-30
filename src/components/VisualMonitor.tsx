import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";
import { useVisualOutputPreviews } from "../hooks/useVisualOutputPreviews";
import { VisualStage } from "./VisualStage";

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
  const sidebar = variant === "sidebar";

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
            <VisualStage
              layers={destination.layers}
              stageRole="control"
              sx={{
                aspectRatio: "16 / 9",
                height: sidebar ? "auto" : 120,
                minHeight: sidebar ? 0 : 120,
              }}
            />
          </Box>
        ))}
      </Box>
    </Box>
  );
}
