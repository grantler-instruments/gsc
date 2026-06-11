import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";

export function ProjectLoadingScreen({ restoring }: { restoring: boolean }) {
  const { t } = useTranslation();
  const message = restoring ? t("project.restoringProject") : t("project.loadingAssets");

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
      }}
    >
      <CircularProgress size={36} />
      <Typography variant="body2" color="text.secondary">
        {message}
      </Typography>
    </Box>
  );
}
