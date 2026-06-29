import { execFileSync, execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { renderGscLogoMarkSvg } from "../src/brand/gscLogoMark";

const PNG_SIZES = [192, 512] as const;

function hasMagick(): boolean {
  try {
    execFileSync("magick", ["-version"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function committedAssetsExist(rootDir: string): boolean {
  const publicDir = path.join(rootDir, "public");
  if (!fs.existsSync(path.join(publicDir, "favicon.svg"))) return false;
  return PNG_SIZES.every((size) => fs.existsSync(path.join(publicDir, `pwa-${size}x${size}.png`)));
}

function tauriIconsExist(rootDir: string): boolean {
  return fs.existsSync(path.join(rootDir, "src-tauri/icons/icon.png"));
}

function generatePwaPngs(publicDir: string, faviconPath: string): void {
  for (const size of PNG_SIZES) {
    execFileSync(
      "magick",
      [
        "-background",
        "none",
        "-density",
        "384",
        faviconPath,
        "-resize",
        `${size}x${size}`,
        path.join(publicDir, `pwa-${size}x${size}.png`),
      ],
      { stdio: "inherit" },
    );
  }
}

function generateTauriIcons(rootDir: string, faviconPath: string): void {
  const tauriIconsDir = path.join(rootDir, "src-tauri/icons");
  execSync(`npx tauri icon ${JSON.stringify(faviconPath)} -o ${JSON.stringify(tauriIconsDir)}`, {
    cwd: rootDir,
    stdio: "inherit",
  });
}

export function syncFaviconAssets(rootDir: string): void {
  const publicDir = path.join(rootDir, "public");
  const faviconPath = path.join(publicDir, "favicon.svg");
  const logoPath = path.join(publicDir, "logo.svg");
  const svg = `${renderGscLogoMarkSvg()}\n`;
  const existingSvg = fs.existsSync(faviconPath) ? fs.readFileSync(faviconPath, "utf8") : null;
  const existingLogoSvg = fs.existsSync(logoPath) ? fs.readFileSync(logoPath, "utf8") : null;
  const svgUnchanged = existingSvg === svg;
  const logoSvgUnchanged = existingLogoSvg === svg;
  const pwaAssetsExist = committedAssetsExist(rootDir);
  const tauriExist = tauriIconsExist(rootDir);

  if (svgUnchanged && logoSvgUnchanged && pwaAssetsExist && tauriExist) {
    console.log("[sync-favicon] Favicon assets are up to date; skipping regeneration");
    return;
  }

  if (!hasMagick()) {
    if (pwaAssetsExist && tauriExist) {
      console.log("[sync-favicon] ImageMagick not found; using committed favicon assets");
      return;
    }
    throw new Error(
      "[sync-favicon] ImageMagick (magick) is not installed and committed favicon assets are missing. " +
        "Install ImageMagick or run `npm run icons` on a machine with ImageMagick and commit the outputs.",
    );
  }

  const updated: string[] = [];

  if (!svgUnchanged || !logoSvgUnchanged) {
    if (!svgUnchanged) {
      fs.writeFileSync(faviconPath, svg);
      updated.push("favicon.svg");
    }
    if (!logoSvgUnchanged) {
      fs.writeFileSync(logoPath, svg);
      updated.push("logo.svg");
    }
  }

  if (!svgUnchanged || !pwaAssetsExist) {
    generatePwaPngs(publicDir, faviconPath);
    updated.push("PWA PNGs");
  }

  if (!svgUnchanged || !tauriExist) {
    generateTauriIcons(rootDir, faviconPath);
    updated.push("Tauri icons");
  }

  console.log(`[sync-favicon] Updated ${updated.join(", ")}`);
}
