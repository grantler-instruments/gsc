import DownloadOutlinedIcon from "@mui/icons-material/DownloadOutlined";
import OpenInBrowserOutlinedIcon from "@mui/icons-material/OpenInBrowserOutlined";
import {
  AppBar,
  Box,
  Button,
  Container,
  Grid,
  Link,
  Paper,
  Stack,
  Toolbar,
  Typography,
  useTheme,
} from "@mui/material";
import { useTranslation } from "react-i18next";
import { GscLogo } from "../brand/GscLogo";
import { CueTypeBadge } from "../components/CueTypeIcon";
import { featureCategoryKeys } from "./features";
import { useCaseKeys } from "./useCases";

/**
 * Logo mark and hero title cap height (matched). Fluid below `md` so the full
 * title stays on one line without overlapping the tagline.
 */
const heroMarkHeight = {
  xs: "clamp(1.25rem, calc((100vw - 6.5rem) / 13), 2.25rem)",
  sm: "clamp(1.75rem, calc((100vw - 7rem) / 13), 3rem)",
  md: 56,
  lg: 64,
};

const webAppUrl = `${import.meta.env.BASE_URL}app/`;
const screenshotUrl = `${import.meta.env.BASE_URL}gsc_edit_screenshot.png`;

/** Update when desktop release artifacts are published. */
const DESKTOP_DOWNLOAD_URL = "#";

const GITHUB_REPO_URL = "https://github.com/grantler-instruments/gsc";

export default function WebsiteApp() {
  const theme = useTheme();
  const { t } = useTranslation();

  return (
    <Box sx={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <AppBar
        position="static"
        elevation={0}
        sx={{
          bgcolor: "background.paper",
          color: "text.primary",
          borderBottom: 1,
          borderColor: "divider",
        }}
      >
        <Toolbar>
          <GscLogo size={28} aria-label={t("common.brand.gsc")} />
          <Typography variant="h6" component="div" sx={{ flexGrow: 1, fontWeight: 600, ml: 1.5 }}>
            {t("common.brand.gsc")}
          </Typography>
        </Toolbar>
      </AppBar>

      <Box component="main" sx={{ flex: 1 }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            py: { xs: 6, md: 10 },
          }}
        >
          <Container maxWidth="lg">
            <Stack
              spacing={4}
              sx={{
                alignItems: { xs: "stretch", sm: "center" },
                textAlign: { xs: "left", sm: "center" },
              }}
            >
              <Stack
                spacing={2.5}
                sx={{
                  alignItems: { xs: "flex-start", sm: "center" },
                  width: "100%",
                }}
              >
                <Stack
                  direction="row"
                  spacing={2}
                  sx={{
                    alignItems: "center",
                    alignSelf: { xs: "flex-start", sm: "center" },
                    maxWidth: "100%",
                  }}
                >
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: heroMarkHeight,
                      height: heroMarkHeight,
                      borderRadius: 2,
                      bgcolor: "background.paper",
                      border: 1,
                      borderColor: "divider",
                      flexShrink: 0,
                      lineHeight: 0,
                    }}
                  >
                    <GscLogo
                      size={80}
                      color={theme.palette.text.primary}
                      style={{ width: "100%", height: "100%" }}
                    />
                  </Box>
                  <Typography
                    component="h1"
                    color="primary"
                    sx={{
                      fontSize: heroMarkHeight,
                      lineHeight: 1,
                      fontWeight: 700,
                      letterSpacing: "-0.02em",
                      whiteSpace: "nowrap",
                      minWidth: 0,
                    }}
                  >
                    {t("common.brand.appName")}
                  </Typography>
                </Stack>
                <Typography
                  variant="h5"
                  color="text.secondary"
                  sx={{ fontWeight: 400, maxWidth: 640 }}
                >
                  {t("website.tagline")}
                </Typography>
              </Stack>

              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={2}
                sx={{ width: "100%", maxWidth: 560 }}
              >
                <Button
                  variant="contained"
                  size="large"
                  href={DESKTOP_DOWNLOAD_URL}
                  startIcon={<DownloadOutlinedIcon />}
                  sx={{ flex: 1, py: 1.75, fontSize: "1.05rem" }}
                >
                  {t("website.downloadDesktop")}
                </Button>
                <Button
                  variant="outlined"
                  size="large"
                  href={webAppUrl}
                  startIcon={<OpenInBrowserOutlinedIcon />}
                  sx={{ flex: 1, py: 1.75, fontSize: "1.05rem" }}
                >
                  {t("website.tryWeb")}
                </Button>
              </Stack>

              <Box
                component="img"
                src={screenshotUrl}
                alt={t("website.screenshotAlt")}
                sx={{
                  display: "block",
                  width: "100%",
                  height: "auto",
                  borderRadius: 2,
                  border: 1,
                  borderColor: "divider",
                  boxShadow: 4,
                }}
              />
            </Stack>
          </Container>
        </Box>

        <Box
          component="section"
          sx={{
            py: { xs: 6, md: 8 },
            borderTop: 1,
            borderColor: "divider",
          }}
        >
          <Container maxWidth="lg">
            <Stack spacing={4}>
              <Typography variant="h4" component="h2" color="primary">
                {t("website.useCasesHeading")}
              </Typography>
              <Grid container spacing={3}>
                {useCaseKeys.map((useCase) => (
                  <Grid key={useCase.key} size={{ xs: 12, sm: 6, md: 4 }}>
                    <Paper
                      variant="outlined"
                      sx={{
                        p: 2.5,
                        height: "100%",
                        bgcolor: "background.paper",
                      }}
                    >
                      <Typography
                        variant="subtitle1"
                        component="h3"
                        sx={{ fontWeight: 600, mb: 1 }}
                      >
                        {t(`website.${useCase.key}`)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {t(`website.${useCase.descKey}`)}
                      </Typography>
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            </Stack>
          </Container>
        </Box>

        <Box
          component="section"
          sx={{
            py: { xs: 6, md: 8 },
            bgcolor: "background.paper",
            borderTop: 1,
            borderColor: "divider",
          }}
        >
          <Container maxWidth="lg">
            <Stack spacing={6}>
              <Typography variant="h4" component="h2" color="primary">
                {t("website.featuresHeading")}
              </Typography>

              {featureCategoryKeys.map((category) => (
                <Stack key={category.key} spacing={3}>
                  <Typography
                    variant="h6"
                    component="h3"
                    color="text.secondary"
                    sx={{ fontWeight: 600 }}
                  >
                    {t(`website.${category.key}`)}
                  </Typography>
                  <Grid container spacing={3}>
                    {category.features.map((feature) => (
                      <Grid key={feature.key} size={{ xs: 12, sm: 6, md: 4 }}>
                        <Paper
                          variant="outlined"
                          sx={{
                            p: 2.5,
                            height: "100%",
                            bgcolor: "background.default",
                          }}
                        >
                          <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 1 }}>
                            {feature.cueType && <CueTypeBadge type={feature.cueType} compact />}
                            <Typography variant="subtitle1" component="h4" sx={{ fontWeight: 600 }}>
                              {t(`website.${feature.key}`)}
                            </Typography>
                          </Stack>
                          <Typography variant="body2" color="text.secondary">
                            {t(`website.${feature.descKey}`)}
                          </Typography>
                        </Paper>
                      </Grid>
                    ))}
                  </Grid>
                </Stack>
              ))}
            </Stack>
          </Container>
        </Box>
      </Box>

      <Box
        component="footer"
        id="contact"
        sx={{
          py: 3,
          bgcolor: "background.paper",
          borderTop: 1,
          borderColor: "divider",
        }}
      >
        <Container>
          <Stack spacing={1}>
            <Typography variant="body2" color="text.secondary">
              {t("website.copyright", { year: new Date().getFullYear() })}
            </Typography>
            <Typography variant="body2" color="text.secondary" component="p">
              {t("website.contributionsBefore")}
              <Link
                href={GITHUB_REPO_URL}
                target="_blank"
                rel="noopener noreferrer"
              >
                {t("website.contributionsLink")}
              </Link>
              {t("website.contributionsAfter")}
            </Typography>
          </Stack>
        </Container>
      </Box>
    </Box>
  );
}
