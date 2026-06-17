import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { useEffect, useState } from "react";
import { inspectorFieldLabelSx, inspectorFieldSx } from "../inspectorSx";

export interface FixtureNumberFieldProps {
  label: string;
  value: number;
  min?: number;
  max?: number;
  readOnly: boolean;
  onCommit: (value: number) => void;
}

export function FixtureNumberField({
  label,
  value,
  min,
  max,
  readOnly,
  onCommit,
}: FixtureNumberFieldProps) {
  const [draft, setDraft] = useState(String(value));

  useEffect(() => {
    setDraft(String(value));
  }, [value]);

  const commitDraft = () => {
    const parsed = Number(draft);
    if (!Number.isFinite(parsed)) {
      setDraft(String(value));
      return;
    }
    onCommit(parsed);
  };

  return (
    <Box component="label" sx={{ ...inspectorFieldSx, flex: 1 }}>
      <Typography component="span" sx={inspectorFieldLabelSx}>
        {label}
      </Typography>
      <input
        type="number"
        min={min}
        max={max}
        value={draft}
        readOnly={readOnly}
        onChange={(event) => setDraft(event.currentTarget.value)}
        onBlur={readOnly ? undefined : commitDraft}
        onKeyDown={
          readOnly
            ? undefined
            : (event) => {
                if (event.key === "Enter") {
                  event.currentTarget.blur();
                }
              }
        }
      />
    </Box>
  );
}
