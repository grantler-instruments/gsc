import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import Accordion, { type AccordionProps } from "@mui/material/Accordion";
import AccordionDetails from "@mui/material/AccordionDetails";
import AccordionSummary from "@mui/material/AccordionSummary";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import type { ReactNode } from "react";

interface InspectorAccordionProps {
  title: string;
  children: ReactNode;
  defaultExpanded?: boolean;
  /** Shrink-wrap content (e.g. General). */
  compact?: boolean;
  /** Fill remaining inspector height with scrollable content (e.g. Details). */
  scroll?: boolean;
  id?: string;
}

const collapseFlexChain = {
  "& .MuiCollapse-root": {
    flex: 1,
    minHeight: 0,
    display: "flex",
    flexDirection: "column",
  },
  "& .MuiCollapse-wrapper": {
    flex: 1,
    minHeight: 0,
    display: "flex",
    flexDirection: "column",
  },
  "& .MuiCollapse-wrapperInner": {
    flex: 1,
    minHeight: 0,
    display: "flex",
    flexDirection: "column",
  },
  "& .MuiAccordion-region": {
    flex: 1,
    minHeight: 0,
    display: "flex",
    flexDirection: "column",
  },
} as const;

export function InspectorAccordion({
  title,
  children,
  defaultExpanded = true,
  compact = false,
  scroll = false,
  id,
}: InspectorAccordionProps) {
  const accordionId = id ?? `inspector-${title.toLowerCase().replace(/\s+/g, "-")}`;

  const accordionSx: AccordionProps["sx"] = {
    bgcolor: "transparent",
    boxShadow: "none",
    "&:before": { display: "none" },
    borderBottom: 1,
    borderColor: "divider",
    ...(compact && { flexShrink: 0 }),
    ...(scroll && {
      flex: 1,
      minHeight: 0,
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
      "&.Mui-expanded": {
        flex: 1,
        minHeight: 0,
        margin: 0,
      },
      ...collapseFlexChain,
    }),
  };

  return (
    <Accordion
      disableGutters
      elevation={0}
      square
      defaultExpanded={defaultExpanded}
      sx={accordionSx}
    >
      <AccordionSummary
        expandIcon={<ExpandMoreIcon sx={{ fontSize: 18 }} />}
        aria-controls={`${accordionId}-content`}
        id={`${accordionId}-header`}
        sx={{
          flexShrink: 0,
          minHeight: 40,
          px: 0,
          "& .MuiAccordionSummary-content": { my: 0.75 },
        }}
      >
        <Typography
          component="span"
          sx={{
            fontSize: 11,
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            color: "text.secondary",
          }}
        >
          {title}
        </Typography>
      </AccordionSummary>
      <AccordionDetails
        sx={{
          p: 0,
          pb: scroll ? 0 : 1.5,
          display: "flex",
          flexDirection: "column",
          ...(scroll && {
            flex: 1,
            minHeight: 0,
            overflow: "hidden",
          }),
        }}
      >
        {scroll ? (
          <Box
            sx={{
              flex: 1,
              minHeight: 0,
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: 1.5,
              pb: 1.5,
            }}
          >
            {children}
          </Box>
        ) : (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>{children}</Box>
        )}
      </AccordionDetails>
    </Accordion>
  );
}
