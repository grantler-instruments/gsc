import FilterListIcon from "@mui/icons-material/FilterList";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import ListItemText from "@mui/material/ListItemText";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useCallback, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { getAssetKindLabel } from "../i18n/cueTypeLabels";
import { isExternalFileDrag } from "../lib/asset-drop";
import {
  type AssetListSort,
  countActiveAssetFilters,
  createDefaultAssetKindFilter,
  filterAndSortAssets,
  MEDIA_ASSET_KINDS,
} from "../lib/cue-asset";
import { pointerLeftElement } from "../lib/dom";
import { isAssetDrag, setActiveAssetDrag, setAssetDragData } from "../lib/drag";
import { useProjectStore } from "../stores/project";
import { useUiStore } from "../stores/ui";
import type { VfsEntry } from "../stores/vfs";
import { useVfsStore } from "../stores/vfs";
import { cueListDropActiveSx } from "../theme/cueStyles";
import { useGscTokens } from "../theme/useGscTokens";
import type { AssetKind } from "../types/cue";
import { CueTypeBadge } from "./CueTypeIcon";

const emptyListSx = {
  py: 2,
  px: 1.5,
  color: "text.secondary",
  fontSize: 13,
} as const;

export function AssetsPanel() {
  const { t } = useTranslation();
  const tokens = useGscTokens();
  const showMode = useUiStore((s) => s.showMode);
  const canEdit = !showMode;
  const entries = useVfsStore((s) => s.entries);
  const importFromDrop = useVfsStore((s) => s.importFromDrop);
  const importFromFileList = useVfsStore((s) => s.importFromFileList);
  const removeEntry = useVfsStore((s) => s.removeEntry);
  const addCue = useProjectStore((s) => s.addCue);
  const setHoveredAssetPath = useUiStore((s) => s.setHoveredAssetPath);
  const inputRef = useRef<HTMLInputElement>(null);
  const [dropActive, setDropActive] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [enabledKinds, setEnabledKinds] = useState(createDefaultAssetKindFilter);
  const [sort, setSort] = useState<AssetListSort>("name-asc");

  const visibleEntries = useMemo(
    () => filterAndSortAssets(entries, { query: searchQuery, enabledKinds, sort }),
    [entries, searchQuery, enabledKinds, sort],
  );
  const activeFilterCount = countActiveAssetFilters(searchQuery, enabledKinds);
  const hasActiveFilters = activeFilterCount > 0;

  const clearFilters = useCallback(() => {
    setSearchQuery("");
    setEnabledKinds(createDefaultAssetKindFilter());
  }, []);

  const onDrop = useCallback(
    async (e: React.DragEvent) => {
      setDropActive(false);
      e.preventDefault();
      e.stopPropagation();
      if (!canEdit) return;
      // Re-dropping an asset from this panel — nothing to import.
      if (isAssetDrag(e.dataTransfer) && !isExternalFileDrag(e.dataTransfer)) {
        return;
      }
      if (!isExternalFileDrag(e.dataTransfer)) return;
      await importFromDrop(e.dataTransfer);
    },
    [canEdit, importFromDrop],
  );

  const onDragOver = useCallback(
    (e: React.DragEvent) => {
      if (isAssetDrag(e.dataTransfer) && !isExternalFileDrag(e.dataTransfer)) {
        setDropActive(false);
        return;
      }
      if (!isExternalFileDrag(e.dataTransfer)) {
        setDropActive(false);
        return;
      }
      e.preventDefault();
      if (!canEdit) {
        e.dataTransfer.dropEffect = "none";
        setDropActive(false);
        return;
      }
      e.dataTransfer.dropEffect = "copy";
      setDropActive(true);
    },
    [canEdit],
  );

  const onDragLeave = useCallback((e: React.DragEvent) => {
    if (pointerLeftElement(e.currentTarget, e.relatedTarget)) {
      setDropActive(false);
    }
  }, []);

  const onFileInput = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files?.length) await importFromFileList(files);
      e.target.value = "";
    },
    [importFromFileList],
  );

  return (
    <Box
      data-gsc-drop-zone="assets"
      onDropCapture={onDrop}
      onDragOverCapture={onDragOver}
      onDragLeaveCapture={onDragLeave}
      sx={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
        overflow: "hidden",
        ...(dropActive && cueListDropActiveSx(tokens)),
      }}
    >
      <Typography variant="caption" sx={{ px: 1.5, py: 1, m: 0, flexShrink: 0 }}>
        {canEdit ? t("assets.dropHint") : t("assets.showModeHint")}
      </Typography>

      {entries.length > 0 && (
        <Box
          sx={{
            px: 1.5,
            pb: 1,
            flexShrink: 0,
            borderBottom: 1,
            borderColor: "divider",
          }}
        >
          <TextField
            size="small"
            fullWidth
            placeholder={t("assets.search")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            sx={{ mb: 1 }}
            inputProps={{ "aria-label": t("assets.search") }}
          />
          <Stack direction="row" sx={{ gap: 1 }}>
            <AssetTypeFilterMenu enabledKinds={enabledKinds} onChange={setEnabledKinds} />
            <Select
              size="small"
              fullWidth
              value={sort}
              onChange={(e) => setSort(e.target.value as AssetListSort)}
              inputProps={{ "aria-label": t("assets.sort") }}
            >
              <MenuItem value="name-asc">{t("assets.sortNameAsc")}</MenuItem>
              <MenuItem value="name-desc">{t("assets.sortNameDesc")}</MenuItem>
              <MenuItem value="type-asc">{t("assets.sortTypeAsc")}</MenuItem>
              <MenuItem value="type-desc">{t("assets.sortTypeDesc")}</MenuItem>
            </Select>
          </Stack>
          {hasActiveFilters && (
            <Stack
              direction="row"
              sx={{
                alignItems: "center",
                justifyContent: "space-between",
                gap: 1,
                mt: 1,
                minWidth: 0,
              }}
            >
              <Typography variant="caption" color="text.secondary" sx={{ m: 0, minWidth: 0 }}>
                {t("assets.filtersActive", { count: activeFilterCount })}
                {visibleEntries.length < entries.length &&
                  ` · ${t("assets.showingFiltered", {
                    visible: visibleEntries.length,
                    total: entries.length,
                  })}`}
              </Typography>
              <Button
                size="small"
                variant="text"
                onClick={clearFilters}
                sx={{ flexShrink: 0, minWidth: 0 }}
              >
                {t("assets.clearFilters")}
              </Button>
            </Stack>
          )}
        </Box>
      )}

      <Box
        component="ul"
        onMouseLeave={(e) => {
          if (pointerLeftElement(e.currentTarget, e.relatedTarget)) {
            setHoveredAssetPath(null);
          }
        }}
        sx={{
          listStyle: "none",
          m: 0,
          py: 0.5,
          px: 0,
          overflowY: "auto",
          flex: 1,
          minHeight: 0,
        }}
      >
        {entries.length === 0 && (
          <Box component="li" sx={emptyListSx}>
            {t("assets.empty")}
          </Box>
        )}
        {entries.length > 0 && visibleEntries.length === 0 && (
          <Box component="li" sx={emptyListSx}>
            {t("assets.noMatches")}
          </Box>
        )}
        {visibleEntries.map((entry) => (
          <AssetRow
            key={entry.path}
            entry={entry}
            canEdit={canEdit}
            tokens={tokens}
            onHoverChange={setHoveredAssetPath}
            onAddCue={() =>
              addCue({
                name: entry.name,
                type: entry.kind,
                assetPath: entry.path,
              })
            }
            onRemove={() => removeEntry(entry.path)}
          />
        ))}
      </Box>

      {canEdit && (
        <Box
          component="footer"
          sx={{
            display: "flex",
            alignItems: "center",
            px: 1.5,
            py: 1,
            borderTop: 1,
            borderColor: "divider",
            flexShrink: 0,
            bgcolor: "background.default",
          }}
        >
          <Button
            variant="text"
            fullWidth
            title={canEdit ? undefined : t("common.state.disabledInShowMode")}
            onClick={() => inputRef.current?.click()}
          >
            {t("assets.import")}
          </Button>
        </Box>
      )}

      <input
        ref={inputRef}
        type="file"
        multiple
        hidden
        // @ts-expect-error webkitdirectory is non-standard but widely supported
        webkitdirectory=""
        directory=""
        onChange={onFileInput}
      />
    </Box>
  );
}

function AssetTypeFilterMenu({
  enabledKinds,
  onChange,
}: {
  enabledKinds: ReadonlySet<AssetKind>;
  onChange: (kinds: Set<AssetKind>) => void;
}) {
  const { t } = useTranslation();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  const allSelected = enabledKinds.size === MEDIA_ASSET_KINDS.length;
  const someSelected = enabledKinds.size > 0 && !allSelected;

  const toggleKind = (kind: AssetKind) => {
    const next = new Set(enabledKinds);
    if (next.has(kind)) next.delete(kind);
    else next.add(kind);
    onChange(next);
  };

  const toggleAll = () => {
    onChange(allSelected ? new Set() : createDefaultAssetKindFilter());
  };

  return (
    <>
      <Button
        size="small"
        variant="outlined"
        fullWidth
        startIcon={<FilterListIcon fontSize="small" />}
        onClick={(e) => setAnchorEl(e.currentTarget)}
        aria-label={t("assets.filterType")}
        sx={{ minWidth: 0, justifyContent: "flex-start" }}
      >
        {allSelected
          ? t("assets.filterType")
          : t("assets.filterTypeCount", { count: enabledKinds.size })}
      </Button>
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        transformOrigin={{ vertical: "top", horizontal: "left" }}
      >
        <MenuItem
          dense
          onClick={(e) => {
            e.preventDefault();
            toggleAll();
          }}
        >
          <Checkbox
            size="small"
            checked={allSelected}
            indeterminate={someSelected}
            tabIndex={-1}
            disableRipple
            sx={{ py: 0, mr: 0.5 }}
          />
          <ListItemText primary={t("assets.filterAll")} />
        </MenuItem>
        <Divider />
        {MEDIA_ASSET_KINDS.map((kind) => (
          <MenuItem
            key={kind}
            dense
            onClick={(e) => {
              e.preventDefault();
              toggleKind(kind);
            }}
          >
            <Checkbox
              size="small"
              checked={enabledKinds.has(kind)}
              tabIndex={-1}
              disableRipple
              sx={{ py: 0, mr: 0.5 }}
            />
            <ListItemText primary={getAssetKindLabel(kind)} />
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}

function onAssetDragStart(e: React.DragEvent, entry: VfsEntry) {
  if (!entry.loaded) return;
  setAssetDragData(e.dataTransfer, {
    path: entry.path,
    name: entry.name,
    kind: entry.kind,
  });
}

function AssetRow({
  entry,
  canEdit,
  tokens,
  onHoverChange,
  onAddCue,
  onRemove,
}: {
  entry: VfsEntry;
  canEdit: boolean;
  tokens: ReturnType<typeof useGscTokens>;
  onHoverChange: (path: string | null) => void;
  onAddCue: () => void;
  onRemove: () => void;
}) {
  const { t } = useTranslation();
  const unavailable = !entry.loaded;
  const title = unavailable ? `${entry.path}\n${t("assets.fileUnavailableTooltip")}` : entry.path;

  return (
    <Box
      component="li"
      data-asset-path={entry.path}
      draggable={canEdit && !unavailable}
      onMouseEnter={unavailable ? undefined : () => onHoverChange(entry.path)}
      onMouseLeave={
        unavailable
          ? undefined
          : (e) => {
              if (pointerLeftElement(e.currentTarget, e.relatedTarget)) {
                onHoverChange(null);
              }
            }
      }
      onDragStart={canEdit && !unavailable ? (e) => onAssetDragStart(e, entry) : undefined}
      onDragEnd={canEdit && !unavailable ? () => setActiveAssetDrag(null) : undefined}
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1,
        py: 0.75,
        px: 1.5,
        borderBottom: 1,
        borderColor: "divider",
        opacity: unavailable ? 0.55 : 1,
        "&:hover": { bgcolor: unavailable ? undefined : tokens.bgHover },
        ...(canEdit &&
          !unavailable && {
            cursor: "grab",
            "&:active": { cursor: "grabbing" },
          }),
      }}
    >
      <CueTypeBadge type={entry.kind} showLabel={false} compact />
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography component="span" noWrap title={title} sx={{ display: "block", fontSize: 13 }}>
          {entry.name}
        </Typography>
        {unavailable && (
          <Typography
            component="span"
            sx={{ display: "block", fontSize: 11, color: "warning.main", lineHeight: 1.2 }}
          >
            {t("assets.fileUnavailable")}
          </Typography>
        )}
      </Box>
      {canEdit && (
        <Stack direction="row" sx={{ gap: 0.25, flexShrink: 0 }}>
          <IconButton
            size="small"
            title={unavailable ? t("assets.reimportBeforeCue") : t("assets.addAsCue")}
            disabled={unavailable}
            onClick={onAddCue}
          >
            +
          </IconButton>
          <IconButton size="small" title={t("common.action.remove")} onClick={onRemove}>
            ×
          </IconButton>
        </Stack>
      )}
    </Box>
  );
}
