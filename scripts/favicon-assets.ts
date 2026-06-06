import { execFileSync, execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { renderGscLogoMarkSvg } from "../src/brand/gscLogoMark";

const PNG_SIZES = [192, 512] as const;

export function syncFaviconAssets(rootDir: string): void {
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
