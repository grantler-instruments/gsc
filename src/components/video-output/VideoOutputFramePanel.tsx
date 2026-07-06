import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  applyLinkedDestQuadSize,
  defaultVideoOutputFrame,
  isIdentityVideoOutputFrame,
  normalizeVideoOutputFrame,
  quadToBoundingRect,
  rectToQuad,
} from "../../lib/video-output-frame";
import type { NormalizedQuad, VideoOutputFrame } from "../../types/video-output-frame";
import type { VideoOutputFramePreviewSource } from "./FramePreviewStage";
import { QuadEditor } from "./FrameQuadEditor";
import { RectEditor } from "./FrameRectEditor";
import { FRAME_PANEL_WIDTH } from "./frame-panel-layout";

export type { VideoOutputFramePreviewSource } from "./FramePreviewStage";
export { FRAME_PANEL_WIDTH } from "./frame-panel-layout";

interface VideoOutputFramePanelProps {
  preview: VideoOutputFramePreviewSource;
  frame?: VideoOutputFrame;
  canEdit: boolean;
  onChange: (frame: VideoOutputFrame) => void;
}

export function VideoOutputFramePanel({
  preview,
  frame,
  canEdit,
  onChange,
}: VideoOutputFramePanelProps) {
  const { t } = useTranslation();
  const normalized = normalizeVideoOutputFrame(frame);
  const [linkDestSize, setLinkDestSize] = useState(true);

  const patchQuad = useCallback(
    (field: "crop" | "dest", quad: NormalizedQuad) => {
      const next = normalizeVideoOutputFrame({ ...normalized, [field]: quad });
      if (field === "crop" && linkDestSize) {
        onChange(applyLinkedDestQuadSize(next, true));
        return;
      }
      onChange(next);
    },
    [linkDestSize, normalized, onChange],
  );

  const patchCropRect = useCallback(
    (rect: Parameters<typeof rectToQuad>[0]) => {
      const next = normalizeVideoOutputFrame({
        ...normalized,
        crop: rectToQuad(rect),
      });
      onChange(linkDestSize ? applyLinkedDestQuadSize(next, true) : next);
    },
    [linkDestSize, normalized, onChange],
  );

  return (
    <Stack
      spacing={1}
      sx={{
        width: FRAME_PANEL_WIDTH,
        minWidth: FRAME_PANEL_WIDTH,
        flexShrink: 0,
        px: 1,
        py: 0.75,
        borderRight: 1,
        borderColor: "divider",
      }}
    >
      <Typography variant="caption" sx={{ fontSize: 10, fontWeight: 700, color: "text.secondary" }}>
        {t("videoOutput.outputFrame")}
      </Typography>
      <Stack direction="row" spacing={1} sx={{ minWidth: 0, alignItems: "flex-start" }}>
        <RectEditor
          label={t("videoOutput.frameCrop")}
          rect={quadToBoundingRect(normalized.crop)}
          color="#42a5f5"
          disabled={!canEdit}
          preview={preview}
          onChange={patchCropRect}
        />
        <QuadEditor
          label={t("videoOutput.framePlacement")}
          quad={normalized.dest}
          color="#66bb6a"
          disabled={!canEdit}
          preview={preview}
          previewFrame={normalized}
          lockSize={linkDestSize}
          onChange={(dest) => patchQuad("dest", dest)}
        />
      </Stack>
      {canEdit && (
        <FormControlLabel
          control={
            <Checkbox
              size="small"
              checked={linkDestSize}
              onChange={(_, checked) => {
                setLinkDestSize(checked);
                if (checked) {
                  onChange(applyLinkedDestQuadSize(normalized, true));
                }
              }}
              sx={{ py: 0 }}
            />
          }
          label={t("videoOutput.frameLinkSize")}
          sx={{
            m: 0,
            alignItems: "flex-start",
            "& .MuiFormControlLabel-label": { fontSize: 10, lineHeight: 1.3 },
          }}
        />
      )}
      {canEdit && !isIdentityVideoOutputFrame(normalized) && (
        <Button
          size="small"
          variant="text"
          sx={{ fontSize: 10, py: 0, alignSelf: "flex-start" }}
          onClick={() => onChange(defaultVideoOutputFrame())}
        >
          {t("videoOutput.frameReset")}
        </Button>
      )}
    </Stack>
  );
}

export function isOutputFrameActive(frame: VideoOutputFrame | undefined): boolean {
  return !isIdentityVideoOutputFrame(frame);
}
