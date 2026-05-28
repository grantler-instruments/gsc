import path from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";
import { trailingSlashRedirectPlugin } from "./vite-trailing-slash-redirect";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// GitHub Pages project site: https://grantler-instruments.github.io/gsc/
export const SITE_BASENAME = "gsc";

/** Vite `base` — trailing slash required. Override with VITE_BASE (e.g. `/` for Tauri). */
const base = process.env.VITE_BASE ?? `/${SITE_BASENAME}/`;

// @ts-expect-error process is a nodejs global
const host = process.env.TAURI_DEV_HOST;

/** Bind all interfaces in dev so phones on the LAN can load the remote UI from Vite. */
const devHost = host ?? true;

export default defineConfig({
  base,
  plugins: [trailingSlashRedirectPlugin(base), react()],
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
