import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import { useState } from "react";
import { formatFixturePatch } from "../../lib/fixtures";
import type { Fixture } from "../../types/fixture";

interface AddDmxFixtureMenuProps {
  fixtures: Fixture[];
  readOnly?: boolean;
  dropUp?: boolean;
  fullWidth?: boolean;
  onAdd: (fixtureId: string) => void;
}

export function AddDmxFixtureMenu({
  fixtures,
  readOnly = false,
  dropUp = false,
  fullWidth = false,
  onAdd,
}: AddDmxFixtureMenuProps) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const closeMenu = () => setAnchorEl(null);

  return (
    <Box sx={{ position: "relative", flex: fullWidth ? 1 : undefined }}>
      <Button
        variant="text"
        fullWidth={fullWidth}
        disabled={readOnly || fixtures.length === 0}
        title={
          fixtures.length === 0
            ? "All patched fixtures are already in this cue"
            : readOnly
              ? "Disabled in show mode"
              : undefined
        }
        onClick={(event) => setAnchorEl(event.currentTarget)}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        + Fixture ▾
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
        {fixtures.map((fixture) => (
          <MenuItem
            key={fixture.id}
            onClick={() => {
              onAdd(fixture.id);
              closeMenu();
            }}
          >
            {fixture.name}
            <Box component="span" sx={{ ml: 1, color: "text.secondary", fontSize: 12 }}>
              {formatFixturePatch(fixture)}
            </Box>
          </MenuItem>
        ))}
      </Menu>
    </Box>
  );
}
