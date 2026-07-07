import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import LightbulbOutlinedIcon from "@mui/icons-material/LightbulbOutlined";
import Accordion from "@mui/material/Accordion";
import AccordionDetails from "@mui/material/AccordionDetails";
import AccordionSummary from "@mui/material/AccordionSummary";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";
import { formatFixtureListDetail, getFixtureConflicts } from "../../lib/fixtures";
import type { Fixture } from "../../types/fixture";
import { FixtureEditor } from "./FixtureEditor";

const emptyListSx = {
  py: 2,
  px: 1.5,
  color: "text.secondary",
  fontSize: 13,
} as const;

const accordionSx = {
  bgcolor: "transparent",
  boxShadow: "none",
  "&:before": { display: "none" },
  borderBottom: 1,
  borderColor: "divider",
  "&.Mui-expanded": { margin: 0 },
} as const;

export interface FixtureListProps {
  fixtures: Fixture[];
  expandedId: string | null;
  canEdit: boolean;
  readOnly: boolean;
  onExpandedChange: (fixtureId: string | null) => void;
  onUpdate: (id: string, patch: Partial<Omit<Fixture, "id">>) => void;
  onRemove: (id: string) => void;
}

export function FixtureList({
  fixtures,
  expandedId,
  canEdit,
  readOnly,
  onExpandedChange,
  onUpdate,
  onRemove,
}: FixtureListProps) {
  const { t } = useTranslation();

  return (
    <Box sx={{ flexShrink: 0 }}>
      {fixtures.length === 0 && <Box sx={emptyListSx}>{t("fixtures.empty")}</Box>}
      {fixtures.map((fixture) => {
        const conflicts = getFixtureConflicts(fixture, fixtures);
        const expanded = expandedId === fixture.id;

        return (
          <Accordion
            key={fixture.id}
            disableGutters
            elevation={0}
            square
            expanded={expanded}
            onChange={(_, isExpanded) => onExpandedChange(isExpanded ? fixture.id : null)}
            sx={accordionSx}
          >
            <AccordionSummary
              expandIcon={
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.25 }}>
                  {canEdit && (
                    <IconButton
                      size="small"
                      title={t("fixtures.removeFixture")}
                      onClick={(event) => {
                        event.stopPropagation();
                        onRemove(fixture.id);
                      }}
                    >
                      ×
                    </IconButton>
                  )}
                  <ExpandMoreIcon sx={{ fontSize: 18 }} />
                </Box>
              }
              aria-controls={`fixture-${fixture.id}-content`}
              id={`fixture-${fixture.id}-header`}
              sx={{
                minHeight: 40,
                px: 1.5,
                py: 0.25,
                "& .MuiAccordionSummary-content": {
                  my: 0.5,
                  minWidth: 0,
                  overflow: "visible",
                  alignItems: "flex-start",
                  gap: 0.75,
                },
                "&.Mui-expanded": {
                  minHeight: 40,
                },
                "&.Mui-expanded .MuiAccordionSummary-content": {
                  my: 0.5,
                },
              }}
            >
              <Box
                component="span"
                sx={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 20,
                  height: 20,
                  mt: 0.125,
                  borderRadius: 1,
                  bgcolor: "background.default",
                  color: "primary.main",
                  flexShrink: 0,
                }}
              >
                <LightbulbOutlinedIcon sx={{ fontSize: 14 }} aria-hidden />
              </Box>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography
                  component="span"
                  title={fixture.name}
                  sx={{
                    display: "block",
                    fontSize: 12,
                    lineHeight: 1.35,
                    wordBreak: "break-word",
                  }}
                >
                  {fixture.name}
                </Typography>
                <Typography
                  component="span"
                  sx={{
                    display: "block",
                    fontSize: 11,
                    lineHeight: 1.3,
                    color: conflicts.length > 0 ? "warning.main" : "text.secondary",
                    wordBreak: "break-word",
                  }}
                >
                  {formatFixtureListDetail(fixture)}
                  {conflicts.length > 0 ? t("fixtures.addressConflict") : ""}
                </Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails sx={{ px: 1.5, pt: 0, pb: 1.5 }}>
              <FixtureEditor
                fixture={fixture}
                fixtures={fixtures}
                readOnly={readOnly}
                embedded
                onUpdate={(patch) => onUpdate(fixture.id, patch)}
              />
            </AccordionDetails>
          </Accordion>
        );
      })}
    </Box>
  );
}
