import CheckCircleOutlineOutlinedIcon from "@mui/icons-material/CheckCircleOutlineOutlined";
import ErrorOutlineOutlinedIcon from "@mui/icons-material/ErrorOutlineOutlined";
import RadioButtonUncheckedOutlinedIcon from "@mui/icons-material/RadioButtonUncheckedOutlined";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";
import {
  type AssetLoadProgress,
  type AssetLoadStatus,
  useProjectLoadingStore,
} from "../stores/project-loading";

function AssetStatusIcon({ status }: { status: AssetLoadStatus }) {
  switch (status) {
    case "loaded":
      return <CheckCircleOutlineOutlinedIcon sx={{ fontSize: 16, color: "success.main" }} />;
    case "missing":
      return <ErrorOutlineOutlinedIcon sx={{ fontSize: 16, color: "warning.main" }} />;
    case "loading":
      return <CircularProgress size={14} thickness={5} />;
    default:
      return <RadioButtonUncheckedOutlinedIcon sx={{ fontSize: 16, color: "text.disabled" }} />;
  }
}

function AssetProgressRow({ entry }: { entry: AssetLoadProgress }) {
  const { t } = useTranslation();
  const statusLabel =
    entry.status === "loaded"
      ? t("project.assetStatusLoaded")
      : entry.status === "missing"
        ? t("project.assetStatusMissing")
        : entry.status === "loading"
          ? t("project.assetStatusLoading")
          : t("project.assetStatusPending");

  return (
    <Box
      component="li"
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1,
        py: 0.5,
        px: 1,
        opacity: entry.status === "pending" ? 0.7 : 1,
      }}
    >
      <Box sx={{ flexShrink: 0, width: 18, display: "flex", justifyContent: "center" }}>
        <AssetStatusIcon status={entry.status} />
      </Box>
      <Typography
        component="span"
        noWrap
        title={entry.path}
        sx={{ flex: 1, minWidth: 0, fontSize: 13 }}
      >
        {entry.name}
      </Typography>
      <Typography component="span" sx={{ flexShrink: 0, fontSize: 11, color: "text.secondary" }}>
        {statusLabel}
      </Typography>
    </Box>
  );
}

export function ProjectLoadingScreen({ restoring }: { restoring: boolean }) {
  const { t } = useTranslation();
  const assetProgress = useProjectLoadingStore((s) => s.assetProgress);
  const message = restoring ? t("project.restoringProject") : t("project.loadingAssets");
  const loadedCount = assetProgress.filter((entry) => entry.status === "loaded").length;
  const hasAssets = assetProgress.length > 0;

  return (
    <Box
      sx={{
        position: "fixed",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 2,
        bgcolor: "background.default",
        zIndex: (theme) => theme.zIndex.modal + 1,
        px: 2,
      }}
    >
      <CircularProgress size={36} />
      <Typography variant="body2" color="text.secondary">
        {message}
      </Typography>
      {hasAssets && (
        <Typography variant="caption" color="text.secondary">
          {t("project.assetLoadProgress", {
            loaded: loadedCount,
            total: assetProgress.length,
          })}
        </Typography>
      )}
      {hasAssets && (
        <Box
          component="ul"
          sx={{
            listStyle: "none",
            m: 0,
            p: 0,
            width: "min(100%, 28rem)",
            maxHeight: "min(50vh, 20rem)",
            overflowY: "auto",
            border: 1,
            borderColor: "divider",
            borderRadius: 1,
            bgcolor: "background.paper",
          }}
        >
          {assetProgress.map((entry) => (
            <AssetProgressRow key={entry.path} entry={entry} />
          ))}
        </Box>
      )}
    </Box>
  );
}
