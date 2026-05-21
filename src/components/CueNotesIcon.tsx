import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
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
      <span
        className="cue-notes-icon"
        role="img"
        aria-label="Cue notes"
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <InfoOutlinedIcon fontSize="inherit" />
      </span>
    </Tooltip>
  );
}
