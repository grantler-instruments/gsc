import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import Box from "@mui/material/Box";
import Tooltip from "@mui/material/Tooltip";

interface CueNotesIconProps {
  notes: string | undefined;
}

export function CueNotesIcon({ notes }: CueNotesIconProps) {
  const text = notes?.trim();
  if (!text) return null;

  return (
    <Tooltip
      title={text}
      placement="top"
      arrow
      slotProps={{
        tooltip: {
          sx: {
            maxWidth: 300,
            whiteSpace: "pre-wrap",
            fontSize: "12px",
            lineHeight: 1.4,
          },
        },
      }}
    >
      <Box
        component="span"
        role="img"
        aria-label="Cue notes"
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        sx={{
          display: "inline-flex",
          alignItems: "center",
          flexShrink: 0,
          fontSize: 14,
          color: "text.secondary",
          cursor: "help",
        }}
      >
        <InfoOutlinedIcon fontSize="inherit" />
      </Box>
    </Tooltip>
  );
}
