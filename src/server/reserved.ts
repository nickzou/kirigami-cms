import type { OutputFile } from "../core/index.js";

/** First URL segments the dev server keeps for itself. */
export const RESERVED_SEGMENTS = ["admin", "api", "__kirigami"];

/**
 * URLs of pages that the dev server hides behind its own routes. They work in
 * the built site; only `kirigami dev` cannot show them.
 */
export function findShadowedPages(files: readonly OutputFile[]): string[] {
  return files
    .filter((f) => f.path.endsWith(".html"))
    .filter((f) => RESERVED_SEGMENTS.includes(f.path.split("/")[0] ?? ""))
    .map((f) => `/${f.path.replace(/index\.html$/, "")}`);
}
