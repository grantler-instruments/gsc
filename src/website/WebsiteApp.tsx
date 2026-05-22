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
import { GscLogo } from "../brand/GscLogo";
import { CueTypeBadge } from "../components/CueTypeIcon";
import { featureCategories } from "./features";

const siteName = "Grantler Stage Control";

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

/** Update when desktop release artifacts are published. */
const DESKTOP_DOWNLOAD_URL = "#";

export default function WebsiteApp() {
  const theme = useTheme();

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
          <GscLogo size={28} aria-label="GSC" />
          <Typography
            variant="h6"
            component="div"
            sx={{ flexGrow: 1, fontWeight: 600, ml: 1.5 }}
          >
            GSC
          </Typography>
          <Button color="inherit" href="#contact" sx={{ color: "text.primary" }}>
            Contact
          </Button>
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
                    {siteName}
                  </Typography>
                </Stack>
                <Typography
                  variant="h5"
                  color="text.secondary"
                  sx={{ fontWeight: 400, maxWidth: 640 }}
                >
                  Cue-based stage control software — run it in the browser or install
                  the desktop app.
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
                  Download desktop version
                </Button>
                <Button
                  variant="outlined"
                  size="large"
                  href={webAppUrl}
                  startIcon={<OpenInBrowserOutlinedIcon />}
                  sx={{ flex: 1, py: 1.75, fontSize: "1.05rem" }}
                >
                  Try it in the web
                </Button>
              </Stack>
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
                Features
              </Typography>

              {featureCategories.map((category) => (
                <Stack key={category.name} spacing={3}>
                  <Typography
                    variant="h6"
                    component="h3"
                    color="text.secondary"
                    sx={{ fontWeight: 600 }}
                  >
                    {category.name}
                  </Typography>
                  <Grid container spacing={3}>
                    {category.features.map((feature) => (
                      <Grid key={feature.title} size={{ xs: 12, sm: 6, md: 4 }}>
                        <Paper
                          variant="outlined"
                          sx={{
                            p: 2.5,
                            height: "100%",
                            bgcolor: "background.default",
                          }}
                        >
                          <Stack
                            direction="row"
                            spacing={1}
                            sx={{ alignItems: "center", mb: 1 }}
                          >
                            {feature.cueType && (
                              <CueTypeBadge type={feature.cueType} compact />
                            )}
                            <Typography
                              variant="subtitle1"
                              component="h4"
                              sx={{ fontWeight: 600 }}
                            >
                              {feature.title}
                            </Typography>
                          </Stack>
                          <Typography variant="body2" color="text.secondary">
                            {feature.description}
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
          <Typography variant="body2" color="text.secondary">
            © {new Date().getFullYear()} Grantler Instruments.{" "}
            <Link
              href="mailto:info@example.com"
              color="text.primary"
              underline="hover"
            >
              info@example.com
            </Link>
          </Typography>
        </Container>
      </Box>
    </Box>
  );
}
