import Box from "@mui/material/Box";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useProjectStore } from "../stores/project";
import { useUiStore } from "../stores/ui";
import { BrandFileMenu } from "./BrandFileMenu";
import { OpenOutputButton } from "./OpenOutputButton";
import { ShowMetadataDialog } from "./ShowMetadataDialog";
import { ShowModeToggle } from "./ShowModeToggle";

export function ProjectToolbar() {
  const { t } = useTranslation();
  const name = useProjectStore((s) => s.name);
  const showMode = useUiStore((s) => s.showMode);
  const [metadataOpen, setMetadataOpen] = useState(false);
  const canEdit = !showMode;

  return (
    <Box
      component="header"
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1.5,
        px: 1.5,
        py: 1,
        borderBottom: 1,
        borderColor: "divider",
        bgcolor: "background.paper",
        flexShrink: 0,
      }}
    >
      <BrandFileMenu />

      <Box
        component="button"
        type="button"
        onClick={() => canEdit && setMetadataOpen(true)}
        disabled={!canEdit}
        aria-label={t("project.metadata.editAriaLabel")}
        sx={{
          flex: 1,
          minWidth: 0,
          maxWidth: 320,
          mx: "auto",
          fontSize: 14,
          fontWeight: 500,
          px: 0.75,
          py: 0.25,
          borderRadius: 0.75,
          border: "none",
          bgcolor: "transparent",
          color: name ? "text.primary" : "text.secondary",
          cursor: canEdit ? "pointer" : "default",
          font: "inherit",
          textAlign: "center",
          ...(canEdit && {
            "&:hover": { bgcolor: "action.hover" },
            "&:focus-visible": {
              bgcolor: "action.selected",
              outline: "1px solid",
              outlineColor: "divider",
            },
          }),
        }}
      >
        {name || t("project.namePlaceholder")}
      </Box>

      <ShowMetadataDialog open={metadataOpen} onClose={() => setMetadataOpen(false)} />

      <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexShrink: 0 }}>
        <OpenOutputButton />
        <ShowModeToggle />
      </Box>
    </Box>
  );
}
