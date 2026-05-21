import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import type { ReactNode } from "react";

interface PanelHeaderProps {
  title?: string;
  children?: ReactNode;
}

export function PanelHeader({ title, children }: PanelHeaderProps) {
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1,
        px: 1.5,
        py: 1.25,
        borderBottom: 1,
        borderColor: "divider",
        flexShrink: 0,
      }}
    >
      {title ? (
        <Typography
          component="h2"
          variant="subtitle2"
          sx={{ flex: 1, m: 0 }}
        >
          {title}
        </Typography>
      ) : (
        <Box sx={{ flex: 1 }} />
      )}
      {children}
    </Box>
  );
}
