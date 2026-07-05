import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { readBusEffectDragId, setActiveBusEffectDrag, setBusEffectDragData } from "../../lib/drag";
import { busHasVideoEffectType, VIDEO_EFFECT_TYPES } from "../../lib/video-effects";
import type { VideoEffectParams, VideoEffectType } from "../../types/video-effect";
import { useClearOnDragEnd } from "../cue-list/useClearOnDragEnd";
import { renderVideoEffectBlock } from "./VideoPremixerEffectBlock";
import type { VideoEffectsHost } from "./video-premixer-layout";

export {
  ADD_EFFECT_COLUMN_WIDTH,
  FX_BLOCK_WIDTH,
  PREMIXER_EFFECTS_GAP,
  PREMIXER_EFFECTS_PADDING_X,
  PREMIXER_EMPTY_WIDTH,
  premixerContentWidth,
  type VideoEffectsHost,
} from "./video-premixer-layout";

interface VideoBusPremixerProps {
  host: VideoEffectsHost;
  canEdit: boolean;
  onAddEffect: (type: VideoEffectType) => void;
  onUpdateEffect: (
    effectId: string,
    patch: {
      params?: Partial<VideoEffectParams>;
      enabled?: boolean;
    },
  ) => void;
  onRemoveEffect: (effectId: string) => void;
  onReorderEffect: (draggedId: string, targetId: string, place: "before" | "after") => void;
}

type EffectDropTarget = { id: string; place: "before" | "after" };

function effectLabelKey(type: VideoEffectType): `videoOutput.${VideoEffectType}` {
  return `videoOutput.${type}`;
}

export function VideoBusPremixer({
  host,
  canEdit,
  onAddEffect,
  onUpdateEffect,
  onRemoveEffect,
  onReorderEffect,
}: VideoBusPremixerProps) {
  const { t } = useTranslation();
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [dropTarget, setDropTarget] = useState<EffectDropTarget | null>(null);
  const effects = host.effects ?? [];
  const canReorder = canEdit && effects.length > 1;

  const clearDropTarget = useCallback(() => {
    setDropTarget(null);
    setActiveBusEffectDrag(null);
  }, []);
  useClearOnDragEnd(clearDropTarget);

  const getEffectReorderProps = useCallback(
    (effectId: string) => {
      if (!canReorder) return undefined;
      return {
        canReorder: true,
        dropTarget: dropTarget?.id === effectId ? dropTarget.place : null,
        onDragStart: (e: React.DragEvent) => setBusEffectDragData(e.dataTransfer, { effectId }),
        onDragOver: (e: React.DragEvent) => {
          const draggedId = readBusEffectDragId(e.dataTransfer);
          if (draggedId === null || draggedId === effectId) return;
          e.preventDefault();
          e.dataTransfer.dropEffect = "move";
          const rect = e.currentTarget.getBoundingClientRect();
          const place = e.clientX < rect.left + rect.width / 2 ? "before" : "after";
          setDropTarget({ id: effectId, place });
        },
        onDragLeave: () => setDropTarget((prev) => (prev?.id === effectId ? null : prev)),
        onDrop: (e: React.DragEvent) => {
          const draggedId = readBusEffectDragId(e.dataTransfer);
          if (draggedId === null) return;
          e.preventDefault();
          const rect = e.currentTarget.getBoundingClientRect();
          const place = e.clientX < rect.left + rect.width / 2 ? "before" : "after";
          if (draggedId !== effectId) onReorderEffect(draggedId, effectId, place);
          clearDropTarget();
        },
        onDragEnd: clearDropTarget,
      };
    },
    [canReorder, clearDropTarget, dropTarget, onReorderEffect],
  );

  const availableTypes = VIDEO_EFFECT_TYPES.filter((type) => !busHasVideoEffectType(host, type));

  const addEffectMenu = canEdit && availableTypes.length > 0 && (
    <>
      <Button
        size="small"
        variant="text"
        sx={{ fontSize: 10, py: 0 }}
        onClick={(e) => setMenuAnchor(e.currentTarget)}
      >
        {t("videoOutput.addEffect")}
      </Button>
      <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={() => setMenuAnchor(null)}>
        {availableTypes.map((type) => (
          <MenuItem
            key={type}
            onClick={() => {
              onAddEffect(type);
              setMenuAnchor(null);
            }}
          >
            {t(effectLabelKey(type))}
          </MenuItem>
        ))}
      </Menu>
    </>
  );

  const effectContext = {
    t,
    canEdit,
    onUpdateEffect,
    onRemoveEffect,
    getEffectReorderProps,
  };

  return (
    <Box
      sx={{
        flex: 1,
        minWidth: 0,
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
        bgcolor: "action.hover",
      }}
    >
      <Stack
        direction="row"
        sx={{
          alignItems: "center",
          px: 1,
          py: 0.5,
          borderBottom: 1,
          borderColor: "divider",
          flexShrink: 0,
        }}
      >
        <Typography
          variant="caption"
          sx={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.04em", color: "text.secondary" }}
        >
          {t("videoOutput.premixer")}
        </Typography>
      </Stack>

      <Box sx={{ flex: 1, minHeight: 0, display: "flex", minWidth: 0 }}>
        {effects.length === 0 ? (
          <Box
            sx={{
              flex: 1,
              minWidth: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              px: 1,
            }}
          >
            <Typography variant="caption" color="text.secondary" sx={{ textAlign: "center" }}>
              {t("videoOutput.noEffects")}
            </Typography>
          </Box>
        ) : (
          <Box
            sx={{
              flex: 1,
              minWidth: 0,
              minHeight: 0,
              overflow: "auto",
              display: "flex",
              gap: 1,
              px: 1,
            }}
          >
            {effects.map((effect) => renderVideoEffectBlock(effect, effectContext))}
          </Box>
        )}

        {addEffectMenu && (
          <Box
            sx={{
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              px: 1,
              borderLeft: 1,
              borderColor: "divider",
            }}
          >
            {addEffectMenu}
          </Box>
        )}
      </Box>
    </Box>
  );
}
