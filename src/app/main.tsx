import React from "react";
import ReactDOM from "react-dom/client";
import "../i18n";
import App from "../App";
import { OutputApp } from "../components/OutputApp";
import { isOutputMode } from "../platform/output-window";
import { GscThemeProvider } from "../theme/GscThemeProvider";

const isOutput = isOutputMode();

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    {isOutput ? (
      <OutputApp />
    ) : (
      <GscThemeProvider>
        <App />
      </GscThemeProvider>
    )}
  </React.StrictMode>,
);
