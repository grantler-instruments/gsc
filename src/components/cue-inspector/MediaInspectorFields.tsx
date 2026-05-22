import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import type { Cue } from "../../types/cue";
import { CueAssetPreview } from "../CueAssetPreview";
import { LoopFields } from "../LoopFields";
import { PlaybackRangeFields } from "../PlaybackRangeFields";
import { inspectorFieldLabelSx, inspectorFieldSx } from "../inspectorSx";

interface MediaInspectorFieldsProps {
  cue: Cue;
  readOnly: boolean;
  onChange: (patch: Partial<Cue>) => void;
}

export function MediaInspectorFields({
  cue,
  readOnly,
  onChange,
}: MediaInspectorFieldsProps) {
  const isMedia =
    cue.type === "audio" || cue.type === "video" || cue.type === "image";
  if (!isMedia) return null;

  return (
    <>
      {(cue.type === "video" || cue.type === "image") && cue.assetPath && (
        <Box sx={inspectorFieldSx}>
          <Typography component="span" sx={inspectorFieldLabelSx}>
            Preview
          </Typography>
          <CueAssetPreview cue={cue} />
        </Box>
      )}

      <PlaybackRangeFields cue={cue} readOnly={readOnly} onChange={onChange} />

      {(cue.type === "audio" || cue.type === "video") && (
        <>
          <LoopFields cue={cue} readOnly={readOnly} onChange={onChange} />
          <Box component="label" sx={inspectorFieldSx}>
            Fade in (s)
            <input
              type="number"
              min={0}
              step={0.1}
              value={cue.fadeIn ?? 0}
              disabled={readOnly}
              onChange={(e) =>
                onChange({
                  fadeIn: Math.max(0, Number(e.currentTarget.value)),
                })
              }
            />
          </Box>
          <Box component="label" sx={inspectorFieldSx}>
            Fade out (s)
            <input
              type="number"
              min={0}
              step={0.1}
              value={cue.fadeOut ?? 0}
              disabled={readOnly}
              onChange={(e) =>
                onChange({
                  fadeOut: Math.max(0, Number(e.currentTarget.value)),
                })
              }
            />
          </Box>
          <Box component="label" sx={inspectorFieldSx}>
            Volume
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={cue.volume ?? 1}
              disabled={readOnly}
              onChange={(e) =>
                onChange({ volume: Number(e.currentTarget.value) })
              }
            />
          </Box>
        </>
      )}

      {(cue.type === "video" || cue.type === "image") && (
        <Box component="label" sx={inspectorFieldSx}>
          Opacity
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={cue.opacity ?? 1}
            disabled={readOnly}
            onChange={(e) =>
              onChange({ opacity: Number(e.currentTarget.value) })
            }
          />
        </Box>
      )}

      {cue.assetPath && (
        <Box component="label" sx={inspectorFieldSx}>
          Asset
          <input type="text" value={cue.assetPath} readOnly />
        </Box>
      )}
    </>
  );
}
