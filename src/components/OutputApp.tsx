import Box from "@mui/material/Box";
import GlobalStyles from "@mui/material/GlobalStyles";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAppViewport } from "../hooks/useAppViewport";
import { useNdiFramePublisher } from "../hooks/useNdiFramePublisher";
import { useOutputAssetReceiver } from "../hooks/useOutputAssetReceiver";
import { useOutputWindowKeyboard } from "../hooks/useOutputWindowKeyboard";
import { useOutputWindowLifecycle } from "../hooks/useOutputWindowLifecycle";
import { useResolvedOutputLayers } from "../hooks/useResolvedOutputLayers";
import { createOutputChannel, isOutputMessage, postRequestState } from "../lib/output-channel";
import type { OutputState } from "../types/output";
import { VisualStage } from "./VisualStage";

/** Full-screen output window — subscribes to cross-window state. */
export function OutputApp() {
  const { t } = useTranslation();
  const [state, setState] = useState<OutputState>({
    revision: 0,
    projectId: "",
    layers: [],
  });
  const layers = useResolvedOutputLayers(state);
  const channelRef = useRef<BroadcastChannel | null>(null);

  useAppViewport();
  useNdiFramePublisher();
  useOutputAssetReceiver();
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
    channelRef.current = channel;

    channel.onmessage = (event: MessageEvent) => {
      if (!isOutputMessage(event.data)) return;
      if (event.data.type === "state") {
        setState(event.data.payload);
      }
    };

    postRequestState(channel);

    return () => {
      channel.close();
      channelRef.current = null;
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
        <VisualStage
          layers={layers}
          stageRole="output"
          sx={{ minHeight: "100%", height: "100%" }}
        />
      </Box>
    </>
  );
}
