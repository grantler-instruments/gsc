import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Slider from "@mui/material/Slider";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { getPrimarySelectedCueId } from "../lib/cue-selection";
import { getCueDisplayName } from "../lib/cues";
import {
  getRemoteConnectionState,
  sendRemoteCommand,
  sendRemoteMasterVolume,
  subscribeRemoteConnection,
} from "../lib/remote-client";
import { triggerGoSelected } from "../lib/transport-actions";
import { isRemoteClient } from "../platform/remote-mode";
import { findProjectCue, useMainSequenceList, useProjectStore } from "../stores/project";
import { useTransportStore } from "../stores/transport";
import type { Cue } from "../types/cue";
import { useCompactLayout } from "../hooks/useCompactLayout";
import { compactLayoutBreakpoint, panelEdgeBorder } from "../layout/responsiveLayout";
import { SIDEBAR_WIDTH } from "../types/sidebar";
import { CueTypeBadge } from "./CueTypeIcon";
import { TransportCueThumbnail } from "./TransportCueThumbnail";

const TRANSPORT_FOOTER_HEIGHT = 72;
const NOTES_ROW_HEIGHT = 36;
const STATUS_SLOT_WIDTH = 240;

function CueNotesLine({ notes }: { notes?: string }) {
  const text = notes?.trim();

  return (
    <Box
      sx={{
        height: NOTES_ROW_HEIGHT,
        overflowY: "clip",
        flexShrink: 0,
      }}
    >
      {text ? (
        <Typography
          component="p"
          variant="caption"
          sx={{
            m: 0,
            whiteSpace: "pre-wrap",
            lineHeight: 1.35,
            fontSize: 12,
            color: "text.secondary",
          }}
        >
          {text}
        </Typography>
      ) : null}
    </Box>
  );
}

function CueSummary({ cue, allCues }: { cue: Cue; allCues?: Cue[] }) {
  const displayName = allCues ? getCueDisplayName(cue, allCues) : cue.name;

  return (
    <Stack direction="row" sx={{ alignItems: "flex-start", gap: 1.25, minWidth: 0 }}>
      <Box sx={{ alignSelf: "center", flexShrink: 0 }}>
        <CueTypeBadge type={cue.type} showLabel={false} />
      </Box>
      <TransportCueThumbnail cue={cue} allCues={allCues} />
      <Stack sx={{ flex: 1, minWidth: 0, pt: 0.125 }}>
        <Typography noWrap sx={{ lineHeight: 1.3, fontSize: 14 }}>
          {displayName}
        </Typography>
        <CueNotesLine notes={cue.notes} />
      </Stack>
    </Stack>
  );
}

export function TransportBar() {
  const { t } = useTranslation();
  const compact = useCompactLayout();
  const isRemote = isRemoteClient();
  const [remoteConnected, setRemoteConnected] = useState(
    () => !isRemote || getRemoteConnectionState() === "connected",
  );
  useEffect(() => {
    if (!isRemote) return;
    return subscribeRemoteConnection((state) => {
      setRemoteConnected(state === "connected");
    });
  }, [isRemote]);
  const cueLists = useProjectStore((s) => s.cueLists);
  const mainList = useMainSequenceList();
  const selectedCueIds = mainList?.selectedCueIds ?? [];
  const selectedCueId = getPrimarySelectedCueId(selectedCueIds);
  const cues = mainList?.cues ?? [];
  const isPlaying = useTransportStore((s) => s.isPlaying);
  const activeCueId = useTransportStore((s) => s.activeCueId);
  const masterVolume = useTransportStore((s) => s.masterVolume);
  const panic = useTransportStore((s) => s.panic);
  const setMasterVolume = useTransportStore((s) => s.setMasterVolume);
  const selectedCue = cues.find((c) => c.id === selectedCueId);
  const activeCue = activeCueId ? findProjectCue(cueLists, activeCueId) : undefined;
  const activeCount = useTransportStore((s) => s.activeCueIds.length);
  const playingOther = isPlaying && activeCue && activeCue.id !== selectedCueId;

  return (
    <Box
      component="footer"
      sx={{
        display: "flex",
        alignItems: "stretch",
        height: TRANSPORT_FOOTER_HEIGHT,
        borderTop: 1,
        borderColor: "divider",
        bgcolor: "background.paper",
        flexShrink: 0,
        minWidth: 0,
        overflowX: "clip",
      }}
    >
      <Stack
        direction="row"
        sx={{
          width: compact ? "auto" : SIDEBAR_WIDTH,
          flex: compact ? "1 1 0" : `0 0 ${SIDEBAR_WIDTH}px`,
          minWidth: 0,
          px: { xs: 1, [compactLayoutBreakpoint]: 1.5 },
          gap: 1,
          alignItems: "center",
          borderRight: panelEdgeBorder,
          "& .MuiButton-root": { flex: 1, minWidth: 0 },
        }}
      >
        <Button
          variant="contained"
          color="success"
          onClick={triggerGoSelected}
          disabled={cues.length === 0 || !remoteConnected}
        >
          {t("transport.go")}
        </Button>
        <Button
          variant="outlined"
          color="error"
          onClick={() => {
            if (isRemoteClient()) {
              sendRemoteCommand({ action: "panic" });
              return;
            }
            panic();
          }}
        >
          {t("transport.panic")}
        </Button>
      </Stack>

      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: { xs: 1, sm: 2 },
          flex: 1,
          minWidth: 0,
          px: { xs: 1, sm: 2 },
          py: 0.75,
          overflow: "hidden",
        }}
      >
        <Box sx={{ flex: 1, minWidth: 0 }}>
          {selectedCue ? <CueSummary cue={selectedCue} allCues={cues} /> : <CueNotesLine />}
        </Box>

        <Box
          sx={{
            width: compact ? "auto" : STATUS_SLOT_WIDTH,
            maxWidth: compact ? 120 : STATUS_SLOT_WIDTH,
            flexShrink: compact ? 1 : 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            alignSelf: "center",
            minWidth: 0,
            overflow: "hidden",
          }}
        >
          {playingOther && activeCue && !compact ? (
            <CueSummary cue={activeCue} allCues={cues} />
          ) : isPlaying && activeCount > 0 ? (
            <Chip
              label={
                activeCount === 1
                  ? t("common.state.playing")
                  : t("common.state.activeCount", { count: activeCount })
              }
              size="small"
              sx={{
                bgcolor: "var(--playing-badge-bg)",
                color: "success.main",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                height: "auto",
                "& .MuiChip-label": { fontSize: 10, px: 1, py: 0.25 },
              }}
            />
          ) : null}
        </Box>
      </Box>

      <Stack
        direction="row"
        sx={{
          alignItems: "center",
          gap: 1,
          fontSize: 12,
          color: "text.secondary",
          flex: compact ? "0 1 auto" : "0 0 auto",
          minWidth: 0,
          overflowX: "clip",
          px: { xs: 1, sm: 2 },
        }}
      >
        <Typography
          variant="caption"
          color="inherit"
          sx={{ display: { xs: "none", sm: "block" }, flexShrink: 0 }}
        >
          {t("transport.master")}
        </Typography>
        <Box
          sx={{
            width: { xs: 72, sm: 100 },
            flexShrink: 0,
            overflowX: "clip",
          }}
        >
          <Slider
            size="small"
            min={0}
            max={1}
            step={0.01}
            value={masterVolume}
            onChange={(_, value) => {
              const next = value as number;
              if (isRemoteClient()) {
                sendRemoteMasterVolume(next);
                return;
              }
              setMasterVolume(next);
            }}
            sx={{ width: "100%", color: "primary.main" }}
          />
        </Box>
      </Stack>
    </Box>
  );
}
