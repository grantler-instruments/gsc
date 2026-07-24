import Box from "@mui/material/Box";
import GlobalStyles from "@mui/material/GlobalStyles";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAppViewport } from "../hooks/useAppViewport";
import { useNdiFramePublisher } from "../hooks/useNdiFramePublisher";
import { useOutputWindowKeyboard } from "../hooks/useOutputWindowKeyboard";
import { useOutputWindowLifecycle } from "../hooks/useOutputWindowLifecycle";
import { useResolvedOutputLayers } from "../hooks/useResolvedOutputLayers";
import { storeOutputAssetBlob } from "../lib/output-asset-bridge";
import { createOutputChannel, isOutputMessage, postRequestState } from "../lib/output-channel";
import { isOutputStateFadeOnly, outputStatesEqual } from "../lib/output-layer-sync";
import { applyOutputLayerOpacities } from "../lib/output-opacity";
import type { OutputState } from "../types/output";
import { OutputImperativeStage } from "./OutputImperativeStage";

/** Full-screen output window — subscribes to cross-window state. */
export function OutputApp() {
  const { t } = useTranslation();
  const [state, setState] = useState<OutputState>({
    revision: 0,
    projectId: "",
    projectRootDir: null,
    activeCueIds: [],
    layers: [],
  });
  const stateRef = useRef(state);
  stateRef.current = state;
  const layers = useResolvedOutputLayers(state);

  useAppViewport();
  useNdiFramePublisher();
  useOutputWindowLifecycle();
  useOutputWindowKeyboard();

  useEffect(() => {
    document.title = t("common.brand.outputWindowTitle");
    const html = document.documentElement;
    const { body } = document;
    html.style.background = "#000";
    html.style.colorScheme = "dark";
    body.style.background = "#000";
    body.style.margin = "0";
    body.style.overflow = "hidden";

    return () => {
      html.style.background = "";
      html.style.colorScheme = "";
      body.style.background = "";
      body.style.margin = "";
      body.style.overflow = "";
    };
  }, [t]);

  useEffect(() => {
    const channel = createOutputChannel();
    let cancelled = false;

    channel.onmessage = (event) => {
      if (!isOutputMessage(event.data)) return;

      if (event.data.type === "asset") {
        const { projectId, assetPath, blob } = event.data.payload;
        storeOutputAssetBlob(projectId, assetPath, blob);
        return;
      }

      if (event.data.type !== "state") return;

      const next = event.data.payload;
      const prev = stateRef.current;

      if (outputStatesEqual(prev, next)) return;

      if (isOutputStateFadeOnly(prev, next)) {
        applyOutputLayerOpacities(next.layers);
        return;
      }

      setState(next);
    };

    void channel.ready.then(() => {
      if (!cancelled) postRequestState(channel);
    });

    return () => {
      cancelled = true;
      channel.close();
    };
  }, []);

  return (
    <>
      <GlobalStyles
        styles={{
          "#root": {
            width: "var(--app-vw, 100vw)",
            height: "var(--app-vh, 100vh)",
            background: "#000",
          },
        }}
      />
      <Box
        sx={{
          width: "var(--app-vw, 100vw)",
          height: "var(--app-vh, 100vh)",
          bgcolor: "#000",
          overflow: "hidden",
        }}
      >
        <OutputImperativeStage layers={layers} />
      </Box>
    </>
  );
}
