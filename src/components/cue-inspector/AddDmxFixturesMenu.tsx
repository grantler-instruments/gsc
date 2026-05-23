import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import ListSubheader from "@mui/material/ListSubheader";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import { Fragment, useState } from "react";
import { formatFixturePatch } from "../../lib/fixtures";
import type { Fixture } from "../../types/fixture";

interface AddDmxFixturesMenuProps {
  addableFixtures: Fixture[];
  readOnly?: boolean;
  dropUp?: boolean;
  fullWidth?: boolean;
  onAddAll: () => void;
  onAdd: (fixtureId: string) => void;
}

export function AddDmxFixturesMenu({
  addableFixtures,
  readOnly = false,
  dropUp = false,
  fullWidth = false,
  onAddAll,
  onAdd,
}: AddDmxFixturesMenuProps) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  const hasAddable = addableFixtures.length > 0;

  const closeMenu = () => setAnchorEl(null);

  return (
    <Box sx={{ position: "relative", flex: fullWidth ? 1 : undefined }}>
      <Button
        variant="text"
        fullWidth={fullWidth}
        disabled={readOnly || !hasAddable}
        title={
          !hasAddable
            ? "All patched fixtures are already in this cue"
            : readOnly
              ? "Disabled in show mode"
              : undefined
        }
        onClick={(event) => setAnchorEl(event.currentTarget)}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        + Fixtures ▾
      </Button>
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={closeMenu}
        anchorOrigin={{
          vertical: dropUp ? "top" : "bottom",
          horizontal: "left",
        }}
        transformOrigin={{
          vertical: dropUp ? "bottom" : "top",
          horizontal: "left",
        }}
      >
        <MenuItem
          onClick={() => {
            onAddAll();
            closeMenu();
          }}
        >
          Add all fixtures
        </MenuItem>
        {hasAddable && (
          <Fragment>
            <Divider />
            <ListSubheader
              disableSticky
              sx={{
                bgcolor: "background.paper",
                lineHeight: "32px",
                fontSize: "0.75rem",
                fontWeight: 600,
                color: "text.secondary",
              }}
            >
              Fixture
            </ListSubheader>
            {addableFixtures.map((fixture) => (
              <MenuItem
                key={fixture.id}
                onClick={() => {
                  onAdd(fixture.id);
                  closeMenu();
                }}
              >
                <Box component="span" sx={{ flex: 1 }}>
                  {fixture.name}
                </Box>
                <Box component="span" sx={{ ml: 1.5, color: "text.secondary", fontSize: 12 }}>
                  {formatFixturePatch(fixture)}
                </Box>
              </MenuItem>
            ))}
          </Fragment>
        )}
      </Menu>
    </Box>
  );
}
