export const EDITOR_COLUMN_WIDTH = 220;
export const FRAME_PANEL_WIDTH = EDITOR_COLUMN_WIDTH * 2 + 24;

export const PREVIEW_WIDTH = EDITOR_COLUMN_WIDTH;
export const PREVIEW_HEIGHT = 115;
export const MIN_DRAG_SIZE = 0.08;

export const QUAD_CORNERS = ["tl", "tr", "br", "bl"] as const;

export const RECT_FIELD_SX = {
  flex: "1 1 46%",
  minWidth: 0,
  "& .MuiInputBase-root": { fontSize: 10 },
  "& .MuiInputBase-input": { py: 0.25, px: 0.5, textAlign: "right" },
  "& .MuiInputLabel-root": { fontSize: 10 },
} as const;
