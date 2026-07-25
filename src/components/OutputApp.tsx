import OpenInFullIcon from "@mui/icons-material/OpenInFull";
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
import { toggleWindowFullscreen } from "../platform/window-fullscreen";
import type { OutputState } from "../types/output";
import { OutputImperativeStage } from "./OutputImperativeStage";

/** Full-screen output window — subscribes to cross-window state. */
export function OutputApp() {
  const { t } = useTranslation();
  const [fullscreenControlVisible, setFullscreenControlVisible] = useState(false);
  const [state, setState] = useState<OutputState>({
    revision: 0,
    projectId: "",
    projectRootDir: null,
    activeCueIds: [],
    layers: [],
  });
  const stateRef = useRef(state);
  const fullscreenControlTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  stateRef.current = state;
  const layers = useResolvedOutputLayers(state);

  const hideFullscreenControl = () => {
    if (fullscreenControlTimeoutRef.current) {
      clearTimeout(fullscreenControlTimeoutRef.current);
      fullscreenControlTimeoutRef.current = null;
    }
    setFullscreenControlVisible(false);
  };

  const showFullscreenControl = () => {
    if (fullscreenControlTimeoutRef.current) {
      clearTimeout(fullscreenControlTimeoutRef.current);
    }
    setFullscreenControlVisible(true);
    fullscreenControlTimeoutRef.current = setTimeout(() => {
      fullscreenControlTimeoutRef.current = null;
      setFullscreenControlVisible(false);
    }, 10_000);
  };

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

  useEffect(
    () => () => {
      if (fullscreenControlTimeoutRef.current) {
        clearTimeout(fullscreenControlTimeoutRef.current);
      }
    },
    [],
  );

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
          position: "relative",
        }}
        onMouseLeave={hideFullscreenControl}
        onMouseMove={showFullscreenControl}
      >
        <OutputImperativeStage layers={layers} />
        <Box
          aria-label={t("common.action.expand")}
          className="output-fullscreen-overlay"
          component="button"
          onBlur={hideFullscreenControl}
          onClick={() => void toggleWindowFullscreen()}
          onFocus={showFullscreenControl}
          sx={{
            position: "absolute",
            top: 16,
            left: 16,
            display: "grid",
            placeItems: "center",
            border: 0,
            p: 1,
            borderRadius: "50%",
            color: "common.white",
            bgcolor: "rgba(0, 0, 0, 0.35)",
            cursor: "pointer",
            opacity: fullscreenControlVisible ? 1 : 0,
            transition: "opacity 0.15s ease",
            "&:focus-visible": {
              outline: "3px solid",
              outlineColor: "primary.light",
              outlineOffset: -3,
            },
          }}
        >
          <OpenInFullIcon sx={{ fontSize: 32 }} />
        </Box>
      </Box>
    </>
  );
}
