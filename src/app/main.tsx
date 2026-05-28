import React from "react";
import ReactDOM from "react-dom/client";
import "../i18n";
import App from "../App";
import { OutputApp } from "../components/OutputApp";
import { RemoteApp } from "../components/RemoteApp";
import { isOutputMode } from "../platform/output-window";
import { isRemoteClient } from "../platform/remote-mode";
import { GscThemeProvider } from "../theme/GscThemeProvider";

const isOutput = isOutputMode();
const isRemote = isRemoteClient();

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    {isOutput ? (
      <OutputApp />
    ) : isRemote ? (
      <GscThemeProvider>
        <RemoteApp />
      </GscThemeProvider>
    ) : (
      <GscThemeProvider>
        <App />
      </GscThemeProvider>
    )}
  </React.StrictMode>,
);
