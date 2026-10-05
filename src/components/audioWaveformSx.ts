export const waveformRootSx = {
  position: "relative",
  width: "100%",
  minWidth: 0,
  borderRadius: 1,
  overflow: "hidden",
  border: 1,
  borderColor: "divider",
  bgcolor: "background.default",
};

export const waveformCanvasSx = {
  display: "block",
  width: "100%",
  height: "100%",
};

export const waveformStatusSx = {
  position: "absolute",
  inset: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  px: 1,
  fontSize: 10,
  color: "text.secondary",
  textAlign: "center",
  pointerEvents: "none",
};

export const waveformEditableSx = {
  cursor: "default",
};

export const waveformScrubSx = {
  cursor: "crosshair",
};

export const waveformSeekableSx = {
  cursor: "pointer",
  touchAction: "none",
};

export const waveformZoomableSx = {
  cursor: "grab",
  touchAction: "none",
};

export const waveformDraggingSx = {
  userSelect: "none",
  "& [data-waveform-handle]::before": {
    bgcolor: "text.primary",
  },
};

export const waveformHandlesSx = {
  position: "absolute",
  inset: 0,
  pointerEvents: "none",
};

const waveformHandleBarSx = {
  "&::before": {
    content: '""',
    position: "absolute",
    left: "50%",
    top: 2,
    bottom: 2,
    width: 3,
    ml: "-1.5px",
    borderRadius: "1px",
    bgcolor: "primary.main",
    boxShadow: "0 0 0 1px rgba(0, 0, 0, 0.35)",
  },
  "&:hover::before": {
    bgcolor: "text.primary",
  },
};

const waveformHandleLabelSx = {
  position: "absolute",
  top: 2,
  fontSize: 8,
  fontWeight: 700,
  lineHeight: 1,
  color: "primary.main",
  pointerEvents: "none",
};

export const waveformHandleSx = {
  position: "absolute",
  top: 0,
  bottom: 0,
  width: 14,
  ml: "-7px",
  pointerEvents: "auto",
  cursor: "ew-resize",
  touchAction: "none",
  zIndex: 1,
  ...waveformHandleBarSx,
};

export const waveformHandleInSx = {
  ...waveformHandleSx,
  "&::after": {
    ...waveformHandleLabelSx,
    content: '"In"',
    left: 4,
  },
};

export const waveformHandleOutSx = {
  ...waveformHandleSx,
  "&::after": {
    ...waveformHandleLabelSx,
    content: '"Out"',
    right: 4,
  },
};

/** Round knob on the top edge that sets a fade length. */
export const waveformFadeHandleSx = {
  position: "absolute",
  top: 0,
  width: 12,
  height: 12,
  borderRadius: "50%",
  border: 2,
  borderColor: "primary.main",
  bgcolor: "background.paper",
  boxShadow: "0 0 0 1px rgba(0, 0, 0, 0.35)",
  pointerEvents: "auto",
  cursor: "ew-resize",
  touchAction: "none",
  zIndex: 2,
  "&:hover": {
    bgcolor: "primary.main",
  },
};

export const waveformThumbnailSx = {
  position: "absolute",
  bottom: "calc(100% + 8px)",
  zIndex: 4,
  transform: "translateX(-50%)",
  pointerEvents: "none",
  borderRadius: 1,
  overflow: "hidden",
  border: 1,
  borderColor: "divider",
  bgcolor: "background.default",
  boxShadow: "0 4px 16px rgba(0, 0, 0, 0.35)",
  "& img": {
    display: "block",
    width: 160,
    height: "auto",
    maxHeight: 90,
    objectFit: "cover",
  },
};

export const waveformThumbnailTimeSx = {
  display: "block",
  py: 0.375,
  px: 0.75,
  fontSize: 10,
  fontVariantNumeric: "tabular-nums",
  textAlign: "center",
  color: "text.secondary",
  borderTop: 1,
  borderColor: "divider",
};

export const waveformZoomToolbarSx = {
  display: "flex",
  alignItems: "center",
  gap: 0.25,
  mt: 0.5,
  "& .MuiIconButton-root": {
    p: 0.375,
    fontSize: 16,
  },
};

export const waveformZoomLabelSx = {
  minWidth: 32,
  px: 0.5,
  fontSize: 10,
  fontVariantNumeric: "tabular-nums",
  color: "text.secondary",
};

export const waveformZoomPanSx = {
  flex: 1,
  minWidth: 0,
  mx: 1,
  py: 1,
};
