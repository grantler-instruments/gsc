import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";
import { useProjectStore } from "../stores/project";
import { useUiStore } from "../stores/ui";
import { BrandFileMenu } from "./BrandFileMenu";
import { OpenOutputButton } from "./OpenOutputButton";
import { ShowModeToggle } from "./ShowModeToggle";

export function ProjectToolbar() {
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

      <TextField
        value={name}
        onChange={(e) => setName(e.target.value)}
        slotProps={{
          htmlInput: { readOnly: showMode, "aria-label": "Show name" },
        }}
        sx={{ flex: 1, minWidth: 0 }}
        fullWidth
      />

      <OpenOutputButton />
      <ShowModeToggle />
    </Box>
  );
}
