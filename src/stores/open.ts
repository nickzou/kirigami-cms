import { relative, resolve, sep } from "node:path";
import type { ContentConfig } from "../core/index.js";
import { LocalFolderStore } from "./local-folder.js";

export interface OpenedContent {
  kind: "local-folder";
  /** The folder the content is in. */
  dir: string;
  store: LocalFolderStore;
  /** Folders the listing skips, wherever they appear. */
  ignore: string[];
}

/**
 * Opens the content store a config describes. Relative paths in the config are
 * relative to `baseDir`. `outDir` is where the build writes; when that is a
 * folder directly inside the content, the content does not read it as pages.
 *
 * Another store (Google Drive and so on) is another case here, and the
 * compiler will say where each caller needs to handle it.
 */
export function openContent(
  content: ContentConfig,
  baseDir: string,
  outDir: string,
): OpenedContent {
  switch (content.store) {
    case "local-folder": {
      const dir = resolve(baseDir, content.path);
      const outName = relative(dir, outDir);
      const ignore = [
        ".git",
        "node_modules",
        ...(outName && !outName.includes(sep) ? [outName] : []),
      ];
      return {
        kind: "local-folder",
        dir,
        store: new LocalFolderStore(dir, ignore),
        ignore,
      };
    }
    default: {
      const unknown: never = content.store;
      throw new Error(`Unknown content store: ${String(unknown)}`);
    }
  }
}
