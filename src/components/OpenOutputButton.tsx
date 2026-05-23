import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
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
        sx={{ minWidth: 148 }}
      >
        Output
      </Button>
      {error && (
        <Typography
          component="span"
          variant="caption"
          color="error"
          title={error}
          noWrap
          sx={{ maxWidth: 200 }}
        >
          {error}
        </Typography>
      )}
    </>
  );
}
