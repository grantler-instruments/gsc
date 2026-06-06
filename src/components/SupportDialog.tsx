import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Link from "@mui/material/Link";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";
import {
  BUY_ME_A_COFFEE_BUTTON_URL,
  BUY_ME_A_COFFEE_URL,
  GITHUB_REPO_URL,
} from "../lib/support-links";

interface SupportDialogProps {
  open: boolean;
  onClose: () => void;
}

export function SupportDialog({ open, onClose }: SupportDialogProps) {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{t("support.title")}</DialogTitle>
      <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
        <Typography color="text.secondary">{t("support.intro")}</Typography>
        <Typography color="text.secondary" component="p">
          {t("support.communityBefore")}
          <Link href={GITHUB_REPO_URL} target="_blank" rel="noopener noreferrer">
            {t("support.communityLink")}
          </Link>
          {t("support.communityAfter")}
        </Typography>
        <Typography color="text.secondary">{t("support.funding")}</Typography>
        <Typography color="text.secondary">{t("support.thanks")}</Typography>
        <Box sx={{ display: "flex", justifyContent: "center", pt: 0.5 }}>
          <Link
            href={BUY_ME_A_COFFEE_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={t("support.buyMeACoffeeAria")}
            sx={{ display: "inline-flex", lineHeight: 0 }}
          >
            <Box
              component="img"
              src={BUY_ME_A_COFFEE_BUTTON_URL}
              alt={t("support.buyMeACoffeeAlt")}
              sx={{ height: 60, width: "auto" }}
            />
          </Link>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t("common.action.close")}</Button>
      </DialogActions>
    </Dialog>
  );
}
