import LightbulbOutlinedIcon from "@mui/icons-material/LightbulbOutlined";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";
import { formatFixtureListDetail, getFixtureConflicts } from "../../lib/fixtures";
import { useGscTokens } from "../../theme/useGscTokens";
import type { Fixture } from "../../types/fixture";

const emptyListSx = {
  py: 2,
  px: 1.5,
  color: "text.secondary",
  fontSize: 13,
} as const;

export interface FixtureListProps {
  fixtures: Fixture[];
  selectedId: string | null;
  canEdit: boolean;
  onSelect: (fixture: Fixture) => void;
  onRemove: (id: string) => void;
}

export function FixtureList({
  fixtures,
  selectedId,
  canEdit,
  onSelect,
  onRemove,
}: FixtureListProps) {
  const { t } = useTranslation();
  const tokens = useGscTokens();

  return (
    <Box
      component="ul"
      sx={{
        listStyle: "none",
        m: 0,
        py: 0.5,
        px: 0,
        flexShrink: 0,
      }}
    >
      {fixtures.length === 0 && (
        <Box component="li" sx={emptyListSx}>
          {t("fixtures.empty")}
        </Box>
      )}
      {fixtures.map((fixture) => {
        const conflicts = getFixtureConflicts(fixture, fixtures);
        const selected = fixture.id === selectedId;
        return (
          <Box
            component="li"
            key={fixture.id}
            onClick={() => onSelect(fixture)}
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              py: 0.75,
              px: 1.5,
              borderBottom: 1,
              borderColor: "divider",
              cursor: "pointer",
              bgcolor: selected ? tokens.bgHover : "transparent",
              "&:hover": { bgcolor: tokens.bgHover },
            }}
          >
            <Box
              component="span"
              sx={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: 24,
                height: 24,
                borderRadius: 1,
                bgcolor: "background.default",
                color: "primary.main",
                flexShrink: 0,
              }}
            >
              <LightbulbOutlinedIcon sx={{ fontSize: 16 }} aria-hidden />
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography
                component="span"
                noWrap
                title={fixture.name}
                sx={{ display: "block", fontSize: 13 }}
              >
                {fixture.name}
              </Typography>
              <Typography
                component="span"
                noWrap
                sx={{
                  display: "block",
                  fontSize: 11,
                  color: conflicts.length > 0 ? "warning.main" : "text.secondary",
                }}
              >
                {formatFixtureListDetail(fixture)}
                {conflicts.length > 0 ? t("fixtures.addressConflict") : ""}
              </Typography>
            </Box>
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
          </Box>
        );
      })}
    </Box>
  );
}
