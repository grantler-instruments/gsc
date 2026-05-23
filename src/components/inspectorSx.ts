export const inspectorPanelSx = {
  width: 320,
  flexShrink: 0,
  display: "flex",
  flexDirection: "column",
  minHeight: 0,
  bgcolor: "background.paper",
};

export const inspectorPanelEmptySx = {
  ...inspectorPanelSx,
  justifyContent: "center",
  alignItems: "center",
  p: 3,
};

export const inspectorFieldsSx = {
  flex: 1,
  overflow: "auto",
  p: 1.5,
  display: "flex",
  flexDirection: "column",
  gap: 1.5,
};

export const inspectorFieldSx = {
  display: "flex",
  flexDirection: "column",
  gap: 0.5,
  fontSize: 11,
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  color: "text.secondary",
  "& input:not([type='checkbox']):not([type='range']), & select, & textarea": {
    font: "inherit",
    fontSize: 14,
    fontWeight: 400,
    textTransform: "none",
    letterSpacing: "normal",
    color: "text.primary",
    bgcolor: "background.default",
    border: 1,
    borderStyle: "solid",
    borderColor: "divider",
    borderRadius: 1,
    py: 0.75,
    px: 1,
    "&:focus": {
      outline: "none",
      borderColor: "primary.main",
    },
    "&[readonly]": {
      color: "text.secondary",
      fontSize: 12,
    },
  },
  "& input[type='checkbox']": {
    width: "auto",
    m: 0,
  },
};

export const inspectorFieldCheckboxSx = {
  ...inspectorFieldSx,
  flexDirection: "row",
  alignItems: "center",
  gap: 1,
};

export const inspectorFieldLabelSx = {
  display: "block",
  mb: 0.75,
  fontSize: 11,
  fontWeight: 600,
  color: "text.secondary",
};

export const inspectorReadonlySx = {
  m: 0,
  py: 1,
  px: 1.25,
  fontSize: 14,
  color: "text.primary",
  bgcolor: "background.default",
  border: 1,
  borderColor: "divider",
  borderRadius: 1,
};

export const inspectorGroupSx = {
  m: 0,
  p: 0,
  border: "none",
  display: "flex",
  flexDirection: "column",
  gap: 1.25,
};

export const inspectorGroupCompactSx = {
  gap: 1,
};

export const inspectorGroupLegendSx = {
  fontSize: 11,
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  color: "text.secondary",
  p: 0,
};

export const inspectorToggleGroupSx = {
  alignSelf: "flex-start",
  maxWidth: "100%",
  "& .MuiToggleButton-root": {
    flex: "none",
    px: 1,
    py: 0.25,
    fontSize: 12,
    lineHeight: 1.3,
    whiteSpace: "nowrap",
  },
};

export const inspectorGroupHintSx = {
  mt: -0.5,
  mb: 0,
  fontSize: 11,
  color: "text.secondary",
  lineHeight: 1.4,
  fontWeight: 400,
  textTransform: "none",
  letterSpacing: "normal",
};

export const inspectorHintSx = {
  m: 0,
  fontSize: 12,
  color: "text.secondary",
  lineHeight: 1.4,
};

export const inspectorHintWarningSx = {
  ...inspectorHintSx,
  color: "#e8a87c",
};

export const inspectorTargetLinkSx = {
  display: "inline-flex",
  alignItems: "center",
  gap: 1,
  width: "100%",
  justifyContent: "flex-start",
};

export const inspectorLoopIterationsSx = {
  maxWidth: 72,
  fontVariantNumeric: "tabular-nums",
  textAlign: "center",
  "&::placeholder": {
    color: "text.primary",
    opacity: 0.85,
  },
};

export const inspectorWaveformFieldSx = {
  mb: 1.5,
};

export const inspectorWaveformRangeSummarySx = {
  mt: 0.75,
  mb: 0,
  fontSize: 11,
  fontVariantNumeric: "tabular-nums",
  color: "text.secondary",
};

export const inspectorTimeRowSx = {
  display: "flex",
  alignItems: "center",
  gap: 1,
  "& input": {
    flex: 1,
    minWidth: 0,
  },
};

export const inspectorTimeFormattedSx = {
  fontSize: 12,
  color: "text.secondary",
  fontVariantNumeric: "tabular-nums",
  flexShrink: 0,
  minWidth: "3.5ch",
};

export const inspectorSliderRowSx = {
  display: "flex",
  alignItems: "center",
  gap: 1,
  width: "100%",
  "& input[type='range']": {
    flex: 1,
    minWidth: 0,
    height: 4,
    accentColor: "var(--accent)",
    cursor: "pointer",
    "&:disabled": {
      cursor: "not-allowed",
      opacity: 0.5,
    },
  },
};

export const inspectorSliderNumberInputSx = (width = 56) => ({
  width,
  flexShrink: 0,
  font: "inherit",
  fontSize: 14,
  fontWeight: 400,
  textTransform: "none",
  letterSpacing: "normal",
  color: "text.primary",
  bgcolor: "background.default",
  border: 1,
  borderStyle: "solid",
  borderColor: "divider",
  borderRadius: 1,
  py: 0.75,
  px: 0.75,
  textAlign: "center",
  fontVariantNumeric: "tabular-nums",
  "&:focus": {
    outline: "none",
    borderColor: "primary.main",
  },
  "&[readonly]": {
    color: "text.secondary",
    fontSize: 12,
  },
  "&:disabled": {
    opacity: 0.5,
  },
});

export const inspectorInfiniteBtnSx = {
  flexShrink: 0,
  py: 0.25,
  px: 1,
  font: "inherit",
  fontSize: 14,
  lineHeight: 1.2,
  color: "primary.main",
  bgcolor: "transparent",
  border: 1,
  borderColor: "divider",
  borderRadius: 1,
  cursor: "pointer",
  "&:hover": {
    bgcolor: "background.paper",
    borderColor: "primary.main",
  },
};

export const inspectorDerivedSx = {
  m: 0,
  fontSize: 11,
  color: "primary.main",
};

export const groupChildrenListSx = {
  listStyle: "none",
  m: 0,
  p: 0,
  display: "flex",
  flexDirection: "column",
  gap: 0.5,
};

export const groupChildItemSx = {
  display: "flex",
  alignItems: "center",
  gap: 0.5,
};

export const groupChildStepSx = {
  fontSize: 11,
  fontWeight: 700,
  color: "text.secondary",
  width: 18,
  textAlign: "center",
  flexShrink: 0,
};

export const groupChildSelectSx = {
  flex: 1,
  display: "flex",
  alignItems: "center",
  gap: 1,
  minWidth: 0,
  py: 0.75,
  px: 1,
  border: 1,
  borderColor: "divider",
  borderRadius: 1,
  bgcolor: "background.default",
  color: "text.primary",
  font: "inherit",
  fontSize: 13,
  cursor: "pointer",
  textAlign: "left",
  "&:hover": {
    borderColor: "var(--accent-dim)",
  },
};

export const groupChildNumberSx = {
  color: "primary.main",
  fontWeight: 600,
  fontSize: 12,
  flexShrink: 0,
};

export const groupChildNameSx = {
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};
