export const activeCuesEmptyListSx = {
  p: "16px 12px",
  color: "text.secondary",
  fontSize: 13,
} as const;

export const activeCueLevelSx = {
  display: "flex",
  alignItems: "center",
  gap: 1,
  mt: 0.5,
  fontSize: 10,
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  color: "text.secondary",
  cursor: "default",
  "& input[type='range']": {
    flex: 1,
    minWidth: 0,
    height: 4,
    accentColor: "var(--accent)",
  },
} as const;
