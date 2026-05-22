import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { CssBaseline, ThemeProvider } from "@mui/material";
import WebsiteApp from "./WebsiteApp";
import { websiteTheme } from "./theme";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider theme={websiteTheme}>
      <CssBaseline />
      <WebsiteApp />
    </ThemeProvider>
  </StrictMode>,
);
