import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "../i18n";
import { registerPwaServiceWorker } from "../lib/pwa-install";
import { DirectionalThemeProvider } from "../theme/DirectionalThemeProvider";
import { websiteTheme } from "./theme";
import WebsiteApp from "./WebsiteApp";

registerPwaServiceWorker();

const root = document.getElementById("root");
if (!root) {
  throw new Error("Website root element not found");
}

createRoot(root).render(
  <StrictMode>
    <DirectionalThemeProvider baseTheme={websiteTheme}>
      <WebsiteApp />
    </DirectionalThemeProvider>
  </StrictMode>,
);
