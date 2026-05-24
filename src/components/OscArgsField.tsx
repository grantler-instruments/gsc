import TextField from "@mui/material/TextField";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { formatOscArgsText, parseOscArgsText } from "../lib/osc";
import type { OscArg } from "../types/cue";

interface OscArgsFieldProps {
  cueId: string;
  args: OscArg[];
  readOnly: boolean;
  onChange: (args: OscArg[]) => void;
}

export function OscArgsField({ cueId, args, readOnly, onChange }: OscArgsFieldProps) {
  const { t } = useTranslation();
  const [text, setText] = useState(() => formatOscArgsText(args));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setText(formatOscArgsText(args));
    setError(null);
  }, [cueId]);

  const commit = (value: string, showError = true) => {
    const parsed = parseOscArgsText(value);
    if (parsed === null) {
      if (showError) setError(t("inspector.oscArgsError"));
      return;
    }
    setError(null);
    onChange(parsed);
  };

  return (
    <TextField
      label={t("inspector.args")}
      fullWidth
      value={text}
      disabled={readOnly}
      placeholder={t("inspector.oscArgsPlaceholder")}
      error={Boolean(error)}
      helperText={error ?? t("inspector.oscArgsHint")}
      slotProps={{ input: { readOnly } }}
      onChange={(e) => {
        const next = e.target.value;
        setText(next);
        const parsed = parseOscArgsText(next);
        if (parsed !== null) {
          setError(null);
          onChange(parsed);
          return;
        }
        if (!next.trim()) {
          setError(null);
          onChange([]);
          return;
        }
        setError(null);
      }}
      onBlur={() => commit(text)}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          commit(text);
        }
      }}
      sx={{ mb: 1.5 }}
    />
  );
}
