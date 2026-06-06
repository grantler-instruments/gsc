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
  return PNG_SIZES.every((size) =>
    fs.existsSync(path.join(publicDir, `pwa-${size}x${size}.png`)),
  );
}

export function syncFaviconAssets(rootDir: string): void {
  if (!hasMagick()) {
    if (committedAssetsExist(rootDir)) {
      console.log("[sync-favicon] ImageMagick not found; using committed favicon assets");
      return;
    }
    throw new Error(
      "[sync-favicon] ImageMagick (magick) is not installed and committed favicon assets are missing. " +
        "Install ImageMagick or run `npm run icons` on a machine with ImageMagick and commit the outputs.",
    );
  }

  const publicDir = path.join(rootDir, "public");
  const faviconPath = path.join(publicDir, "favicon.svg");
  const svg = `${renderGscLogoMarkSvg()}\n`;

  fs.writeFileSync(faviconPath, svg);

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

  const tauriIconsDir = path.join(rootDir, "src-tauri/icons");
  execSync(`npx tauri icon ${JSON.stringify(faviconPath)} -o ${JSON.stringify(tauriIconsDir)}`, {
    cwd: rootDir,
    stdio: "inherit",
  });

  console.log("[sync-favicon] Updated favicon.svg, PWA PNGs, and Tauri icons");
}
