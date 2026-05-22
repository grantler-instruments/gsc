import fs from "node:fs";
import path from "node:path";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { Plugin } from "vite";

/** Redirect `/gsc` → `/gsc/` (and `/gsc/app` → `/gsc/app/`) when base is a subpath. */
export function trailingSlashRedirectPlugin(siteBase: string): Plugin {
  if (siteBase === "/" || siteBase === "") {
    return { name: "gsc-trailing-slash-redirect" };
  }

  const basePath = siteBase.replace(/\/$/, "");
  const entryPaths = [basePath, `${basePath}/app`];

  const redirectTarget = (pathname: string): string | null => {
    if (entryPaths.includes(pathname)) {
      return `${pathname}/`;
    }
    return null;
  };

  const redirectMiddleware = (
    req: IncomingMessage,
    res: ServerResponse,
    next: () => void,
  ) => {
    const raw = req.url ?? "";
    const q = raw.indexOf("?");
    const pathname = q === -1 ? raw : raw.slice(0, q);
    const search = q === -1 ? "" : raw.slice(q);
    const target = redirectTarget(pathname);
    if (target) {
      res.writeHead(301, { Location: `${target}${search}` });
      res.end();
      return;
    }
    next();
  };

  const redirectScript = `<script>(function(){var p=location.pathname,b=${JSON.stringify(basePath)};if(p===b||p===b+"/app")location.replace(p+"/"+location.search+location.hash);})();</script>`;

  return {
    name: "gsc-trailing-slash-redirect",
    configureServer(server) {
      server.middlewares.use(redirectMiddleware);
    },
    configurePreviewServer(server) {
      server.middlewares.use(redirectMiddleware);
    },
    transformIndexHtml(html) {
      return html.replace("<head>", `<head>${redirectScript}`);
    },
    writeBundle(options) {
      if (!options.dir) return;
      const content = `<!doctype html><html lang="en"><head><meta charset="UTF-8"/>${redirectScript}</head><body></body></html>`;
      fs.writeFileSync(path.join(options.dir, "404.html"), content);
    },
  };
}
