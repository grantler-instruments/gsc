import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { OutputApp } from "./components/OutputApp";
import { isOutputMode } from "./platform/output-window";
import { GscThemeProvider } from "./theme/GscThemeProvider";
import "./styles/domain.css";

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
