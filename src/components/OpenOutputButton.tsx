import Button from "@mui/material/Button";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import { useCallback, useState } from "react";
import { openOutputWindow } from "../platform/output-window";

export function OpenOutputButton() {
  const [error, setError] = useState<string | null>(null);

  const handleOpen = useCallback(async () => {
    setError(null);
    try {
      await openOutputWindow();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not open output window");
    }
  }, []);

  return (
    <>
      <Button
        variant="outlined"
        size="small"
        startIcon={<OpenInNewIcon fontSize="small" />}
        onClick={handleOpen}
        title="Open audience output window"
      >
        Output
      </Button>
      {error && (
        <span className="output-open-error" title={error}>
          {error}
        </span>
      )}
    </>
  );
}
