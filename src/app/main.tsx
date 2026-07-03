import React from "react";
import ReactDOM from "react-dom/client";
import "../i18n";
import App from "../App";
import { OutputApp } from "../components/OutputApp";
import { RemoteApp } from "../components/RemoteApp";
import { registerPwaServiceWorker } from "../lib/pwa-install";
import { getPlatform } from "../platform";
import { isOutputMode } from "../platform/output-window";
import { isRemoteClient } from "../platform/remote-mode";
import { GscThemeProvider } from "../theme/GscThemeProvider";

const isOutput = isOutputMode();
const isRemote = isRemoteClient();

if (getPlatform() === "web" && !isOutput && !isRemote) {
  registerPwaServiceWorker();
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  isOutput ? (
    <OutputApp />
  ) : (
    <React.StrictMode>
      {isRemote ? (
        <GscThemeProvider>
          <RemoteApp />
        </GscThemeProvider>
      ) : (
        <GscThemeProvider>
          <App />
        </GscThemeProvider>
      )}
    </React.StrictMode>
  ),
);
