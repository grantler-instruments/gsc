import { CssBaseline, ThemeProvider } from "@mui/material";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "../i18n";
import { websiteTheme } from "./theme";
import WebsiteApp from "./WebsiteApp";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider theme={websiteTheme}>
      <CssBaseline />
      <WebsiteApp />
    </ThemeProvider>
  </StrictMode>,
);
