import TextField from "@mui/material/TextField";
import { useEffect, useState } from "react";
import { formatOscArgsText, parseOscArgsText } from "../lib/osc";
import type { OscArg } from "../types/cue";

const INVALID_ARGS_HINT =
  'Use a JSON array like [1, "hello"], a quoted string, or comma-separated values.';

interface OscArgsFieldProps {
  cueId: string;
  args: OscArg[];
  readOnly: boolean;
  onChange: (args: OscArg[]) => void;
}

export function OscArgsField({ cueId, args, readOnly, onChange }: OscArgsFieldProps) {
  const [text, setText] = useState(() => formatOscArgsText(args));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setText(formatOscArgsText(args));
    setError(null);
  }, [cueId]);

  const commit = (value: string, showError = true) => {
    const parsed = parseOscArgsText(value);
    if (parsed === null) {
      if (showError) setError(INVALID_ARGS_HINT);
      return;
    }
    setError(null);
    onChange(parsed);
  };

  return (
    <TextField
      label="Args"
      fullWidth
      value={text}
      disabled={readOnly}
      placeholder='[1, "hello"] or hello, 1, true'
      error={Boolean(error)}
      helperText={error ?? "Numbers, strings (in quotes), or booleans."}
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
