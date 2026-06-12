import { readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { defineConfig } from "vitest/config";
import { syncFaviconPlugin } from "./vite-plugin-sync-favicon";
import { trailingSlashRedirectPlugin } from "./vite-trailing-slash-redirect";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appVersion = (
  JSON.parse(readFileSync(path.join(__dirname, "package.json"), "utf8")) as {
    version: string;
  }
).version;

// GitHub Pages project site: https://grantler-instruments.github.io/gsc/
export const SITE_BASENAME = "gsc";

/** Vite `base` — trailing slash required. Override with VITE_BASE (e.g. `/` for Tauri). */
const base = process.env.VITE_BASE ?? `/${SITE_BASENAME}/`;

// @ts-expect-error process is a nodejs global
const host = process.env.TAURI_DEV_HOST;

/** Bind all interfaces in dev so phones on the LAN can load the remote UI from Vite. */
const exposeOnLan = !host;
const isWindows = os.platform() === "win32";
const devHost = host ?? (isWindows ? "0.0.0.0" : true);

const isVitest = !!process.env.VITEST;

const baseNoSlash = base.replace(/\/$/, "") || "";
const escapedBase = baseNoSlash.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const websiteNavigateDenylist = baseNoSlash
  ? [new RegExp(`^${escapedBase}/?$`), new RegExp(`^${escapedBase}/index\\.html$`)]
  : [/^\/$/, /^\/index\.html$/];

export default defineConfig({
  base,
  define: {
    __APP_VERSION__: JSON.stringify(appVersion),
  },
  plugins: [
    ...(isVitest ? [] : [syncFaviconPlugin(__dirname)]),
    trailingSlashRedirectPlugin(base),
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg", "pwa-192x192.png", "pwa-512x512.png"],
      manifest: {
        name: "Grantler Stage Control",
        short_name: "GSC",
        description: "Show control for cues, lights, and media",
        theme_color: "#1e2229",
        background_color: "#1e2229",
        display: "standalone",
        start_url: "app/",
        scope: "./",
        icons: [
          {
            src: "pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        navigateFallback: "app/index.html",
        navigateFallbackDenylist: websiteNavigateDenylist,
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2,webmanifest}"],
      },
      devOptions: {
        enabled: true,
      },
    }),
  ],
  resolve: {
    alias: {
      "@brand": path.resolve(__dirname, "src/brand"),
    },
  },
  build: {
    rollupOptions: {
      input: {
        website: path.resolve(__dirname, "index.html"),
        app: path.resolve(__dirname, "app/index.html"),
      },
    },
  },
  clearScreen: false,
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
  server: {
    port: 1421,
    strictPort: true,
    host: devHost,
    // Allow phones/tablets on the LAN to load the remote UI (Vite 6+ host allowlist).
    ...(exposeOnLan ? { allowedHosts: true as const } : {}),
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1422,
        }
      : undefined,
    watch: {
      ignored: ["**/src-tauri/**"],
    },
  },
});
