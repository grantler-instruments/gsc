import Box from "@mui/material/Box";
import GlobalStyles from "@mui/material/GlobalStyles";
import { useEffect, useRef, useState } from "react";
import {
  createOutputChannel,
  isOutputMessage,
  postRequestState,
} from "../lib/output-channel";
import type { OutputState } from "../types/output";
import { useResolvedOutputLayers } from "../hooks/useResolvedOutputLayers";
import { VisualStage } from "./VisualStage";

/** Full-screen output window — subscribes to cross-window state. */
export function OutputApp() {
  const [state, setState] = useState<OutputState>({
    revision: 0,
    projectId: "",
    layers: [],
  });
  const layers = useResolvedOutputLayers(state);
  const channelRef = useRef<BroadcastChannel | null>(null);

  useEffect(() => {
    document.title = "GSC Output";
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
  }, []);

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
            width: "100vw",
            height: "100vh",
            background: "#000",
          },
        }}
      />
      <Box
        sx={{
          width: "100vw",
          height: "100vh",
          bgcolor: "#000",
          overflow: "hidden",
        }}
      >
        <VisualStage
          layers={layers}
          role="output"
          sx={{ minHeight: "100%", height: "100%" }}
        />
      </Box>
    </>
  );
}
