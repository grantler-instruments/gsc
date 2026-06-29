import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Typography from "@mui/material/Typography";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  resolveDeleteAssetInUseChoice,
  useDeleteAssetPromptStore,
} from "../stores/delete-asset-prompt";

type Step = "info" | "confirm";

export function DeleteAssetInUseDialog() {
  const { t } = useTranslation();
  const open = useDeleteAssetPromptStore((s) => s.open);
  const assetName = useDeleteAssetPromptStore((s) => s.assetName);
  const cues = useDeleteAssetPromptStore((s) => s.cues);
  const [step, setStep] = useState<Step>("info");

  // Always reopen on the informational step.
  useEffect(() => {
    if (open) setStep("info");
  }, [open]);

  const showListName = useMemo(() => new Set(cues.map((c) => c.listId)).size > 1, [cues]);

  return (
    <Dialog
      open={open}
      onClose={() => resolveDeleteAssetInUseChoice("cancel")}
      maxWidth="sm"
      fullWidth
    >
      {step === "info" ? (
        <>
          <DialogTitle>{t("deleteAssetInUse.title")}</DialogTitle>
          <DialogContent>
            <Typography sx={{ m: 0, fontSize: 14, color: "text.secondary" }}>
              {t("deleteAssetInUse.body", { assetName, count: cues.length })}
            </Typography>
            <CueUsageList cues={cues} showListName={showListName} />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button variant="contained" onClick={() => resolveDeleteAssetInUseChoice("cancel")}>
              {t("common.action.ok")}
            </Button>
            <Button color="error" onClick={() => setStep("confirm")}>
              {t("deleteAssetInUse.deleteCues")}
            </Button>
          </DialogActions>
        </>
      ) : (
        <>
          <DialogTitle>{t("deleteAssetInUse.confirmTitle")}</DialogTitle>
          <DialogContent>
            <Typography sx={{ m: 0, fontSize: 14, color: "text.secondary" }}>
              {t("deleteAssetInUse.confirmBody", { assetName, count: cues.length })}
            </Typography>
            <CueUsageList cues={cues} showListName={showListName} />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => resolveDeleteAssetInUseChoice("cancel")}>
              {t("common.action.cancel")}
            </Button>
            <Button
              color="error"
              variant="contained"
              onClick={() => resolveDeleteAssetInUseChoice("deleteCues")}
            >
              {t("deleteAssetInUse.confirmDelete")}
            </Button>
          </DialogActions>
        </>
      )}
    </Dialog>
  );
}

function CueUsageList({
  cues,
  showListName,
}: {
  cues: ReturnType<typeof useDeleteAssetPromptStore.getState>["cues"];
  showListName: boolean;
}) {
  return (
    <Box
      component="ul"
      sx={{
        mt: 1.5,
        mb: 0,
        pl: 0,
        listStyle: "none",
        maxHeight: 220,
        overflowY: "auto",
        border: 1,
        borderColor: "divider",
        borderRadius: 1,
      }}
    >
      {cues.map((cue) => (
        <Box
          component="li"
          key={cue.cueId}
          sx={{
            display: "flex",
            alignItems: "baseline",
            gap: 1,
            px: 1.5,
            py: 0.75,
            borderBottom: 1,
            borderColor: "divider",
            "&:last-of-type": { borderBottom: 0 },
          }}
        >
          <Typography
            component="span"
            sx={{
              fontSize: 13,
              color: "text.secondary",
              flexShrink: 0,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {cue.number}
          </Typography>
          <Typography component="span" noWrap sx={{ fontSize: 13, flex: 1, minWidth: 0 }}>
            {cue.name}
          </Typography>
          {showListName && (
            <Typography
              component="span"
              noWrap
              sx={{ fontSize: 12, color: "text.secondary", flexShrink: 0 }}
            >
              {cue.listName}
            </Typography>
          )}
        </Box>
      ))}
    </Box>
  );
}
