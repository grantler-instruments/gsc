import path from "node:path";
import { fileURLToPath } from "node:url";
import { syncFaviconAssets } from "./favicon-assets";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
syncFaviconAssets(rootDir);
