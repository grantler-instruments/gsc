import fs from "node:fs";
import type { IncomingMessage, ServerResponse } from "node:http";
import path from "node:path";
import type { Plugin } from "vite";

function splitRequestUrl(raw: string): { pathname: string; search: string } {
  const q = raw.indexOf("?");
  return q === -1
    ? { pathname: raw, search: "" }
    : { pathname: raw.slice(0, q), search: raw.slice(q) };
}

/** Redirect `/gsc` → `/gsc/` (and `/gsc/app` → `/gsc/app/`) when base is a subpath. */
export function trailingSlashRedirectPlugin(siteBase: string): Plugin {
  if (siteBase === "/" || siteBase === "") {
    return { name: "gsc-trailing-slash-redirect" };
  }

  const basePath = siteBase.replace(/\/$/, "");
  const isStableSiteBase = !basePath.endsWith("/experimental");
  const nestedExperimentalApp = `${basePath}/experimental/app`;
  const entryPaths = [basePath, `${basePath}/app`];
  if (isStableSiteBase) {
    entryPaths.push(nestedExperimentalApp);
  }

  const redirectTarget = (pathname: string): string | null => {
    if (entryPaths.includes(pathname)) {
      return `${pathname}/`;
    }
    return null;
  };

  const rewriteExperimentalApp = (pathname: string): string | null => {
    if (!isStableSiteBase) return null;
    if (pathname === nestedExperimentalApp || pathname === `${nestedExperimentalApp}/`) {
      return `${basePath}/app/`;
    }
    const nestedPrefix = `${nestedExperimentalApp}/`;
    if (pathname.startsWith(nestedPrefix)) {
      return `${basePath}/app/${pathname.slice(nestedPrefix.length)}`;
    }
    return null;
  };

  const routingMiddleware = (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    const { pathname, search } = splitRequestUrl(req.url ?? "");
    const rewrite = rewriteExperimentalApp(pathname);
    if (rewrite) {
      req.url = `${rewrite}${search}`;
      next();
      return;
    }
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
      server.middlewares.use(routingMiddleware);
    },
    configurePreviewServer(server) {
      server.middlewares.use(routingMiddleware);
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
