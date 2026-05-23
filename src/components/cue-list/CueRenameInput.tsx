import Box from "@mui/material/Box";
import { cueRenameInputSx } from "../../theme/cueStyles";
import { useGscTokens } from "../../theme/useGscTokens";

interface CueRenameInputProps {
  value: string;
  onChange: (value: string) => void;
  onCommit: () => void;
  onCancel: () => void;
}

export function CueRenameInput({ value, onChange, onCommit, onCancel }: CueRenameInputProps) {
  const tokens = useGscTokens();

  return (
    <Box
      component="input"
      value={value}
      autoFocus
      onClick={(e) => e.stopPropagation()}
      onChange={(e) => onChange(e.currentTarget.value)}
      onBlur={onCommit}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === "Enter") onCommit();
        if (e.key === "Escape") onCancel();
      }}
      sx={cueRenameInputSx(tokens)}
    />
  );
}
