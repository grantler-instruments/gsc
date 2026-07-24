import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  normalizeNormalizedRect,
  patchNormalizedQuadFromRect,
  quadToBoundingRect,
} from "../../lib/video-output-frame";
import type { NormalizedQuad, NormalizedRect } from "../../types/video-output-frame";
import { RECT_FIELD_SX } from "./frame-panel-layout";
import { formatRectPercent, parseRectPercentInput } from "./frame-panel-utils";

type RectField = keyof NormalizedRect;

function RectPercentField({
  label,
  value,
  disabled,
  onCommit,
}: {
  label: string;
  value: number;
  disabled: boolean;
  onCommit: (value: number) => void;
}) {
  const [draft, setDraft] = useState(() => formatRectPercent(value));

  useEffect(() => {
    setDraft(formatRectPercent(value));
  }, [value]);

  const commitDraft = useCallback(() => {
    const parsed = parseRectPercentInput(draft);
    if (parsed === undefined) {
      setDraft(formatRectPercent(value));
      return;
    }
    onCommit(parsed);
  }, [draft, onCommit, value]);

  return (
    <TextField
      label={label}
      size="small"
      value={draft}
      disabled={disabled}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commitDraft}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.currentTarget.blur();
        }
      }}
      slotProps={{
        input: {
          endAdornment: (
            <Typography component="span" sx={{ fontSize: 10, color: "text.secondary", pl: 0.25 }}>
              %
            </Typography>
          ),
        },
      }}
      sx={RECT_FIELD_SX}
    />
  );
}

export function RectValueFields({
  rect,
  disabled,
  lockSize,
  onChange,
}: {
  rect: NormalizedRect;
  disabled: boolean;
  lockSize?: boolean;
  onChange: (rect: NormalizedRect) => void;
}) {
  const { t } = useTranslation();

  const patchField = useCallback(
    (field: RectField, value: number) => {
      onChange(normalizeNormalizedRect({ ...rect, [field]: value }));
    },
    [onChange, rect],
  );

  return (
    <Stack direction="row" useFlexGap spacing={0.5} sx={{ pt: 0.25, flexWrap: "wrap" }}>
      <RectPercentField
        label={t("videoOutput.frameX")}
        value={rect.x}
        disabled={disabled}
        onCommit={(value) => patchField("x", value)}
      />
      <RectPercentField
        label={t("videoOutput.frameY")}
        value={rect.y}
        disabled={disabled}
        onCommit={(value) => patchField("y", value)}
      />
      <RectPercentField
        label={t("videoOutput.frameW")}
        value={rect.w}
        disabled={disabled || Boolean(lockSize)}
        onCommit={(value) => patchField("w", value)}
      />
      <RectPercentField
        label={t("videoOutput.frameH")}
        value={rect.h}
        disabled={disabled || Boolean(lockSize)}
        onCommit={(value) => patchField("h", value)}
      />
    </Stack>
  );
}

export function QuadValueFields({
  quad,
  disabled,
  lockSize,
  onChange,
}: {
  quad: NormalizedQuad;
  disabled: boolean;
  lockSize?: boolean;
  onChange: (quad: NormalizedQuad) => void;
}) {
  const rect = quadToBoundingRect(quad);
  return (
    <RectValueFields
      rect={rect}
      disabled={disabled}
      lockSize={lockSize}
      onChange={(next) => onChange(patchNormalizedQuadFromRect(quad, next))}
    />
  );
}
