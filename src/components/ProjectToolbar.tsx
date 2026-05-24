import Box from "@mui/material/Box";
import InputBase from "@mui/material/InputBase";
import { useTranslation } from "react-i18next";
import { useProjectStore } from "../stores/project";
import { useUiStore } from "../stores/ui";
import { BrandFileMenu } from "./BrandFileMenu";
import { OpenOutputButton } from "./OpenOutputButton";
import { ShowModeToggle } from "./ShowModeToggle";

export function ProjectToolbar() {
  const { t } = useTranslation();
  const name = useProjectStore((s) => s.name);
  const setName = useProjectStore((s) => s.setName);
  const showMode = useUiStore((s) => s.showMode);

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
      }}
    >
      <BrandFileMenu />

      <InputBase
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder={t("project.namePlaceholder")}
        inputProps={{ "aria-label": t("project.nameAriaLabel") }}
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
          color: "text.primary",
          "& .MuiInputBase-input": {
            p: 0,
            textAlign: "center",
            "&::placeholder": { opacity: 0.55 },
          },
          ...(!showMode && {
            "&:hover": { bgcolor: "action.hover" },
            "&.Mui-focused": {
              bgcolor: "action.selected",
              outline: "1px solid",
              outlineColor: "divider",
            },
          }),
        }}
      />

      <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexShrink: 0 }}>
        <OpenOutputButton />
        <ShowModeToggle />
      </Box>
    </Box>
  );
}
