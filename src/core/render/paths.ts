import { assertValidPath } from "../store/path.js";

/**
 * Where a page's HTML goes, with clean URLs: `index.md` stays `index.html`,
 * any other `name.md` becomes `name/index.html`.
 */
export function outputPath(sourcePath: string): string {
  assertValidPath(sourcePath);
  if (!sourcePath.endsWith(".md")) {
    throw new Error(`Not a markdown file (expected .md): ${sourcePath}`);
  }
  const withoutExtension = sourcePath.slice(0, -".md".length);
  if (withoutExtension === "index" || withoutExtension.endsWith("/index")) {
    return `${withoutExtension}.html`;
  }
  return `${withoutExtension}/index.html`;
}

/**
 * The address a page is served at, with clean URLs and each segment encoded:
 * `index.md` is `/`, `blog/hello.md` is `/blog/hello/`.
 */
export function pageUrl(sourcePath: string): string {
  const folder = outputPath(sourcePath).replace(/(^|\/)index\.html$/, "$1");
  return `/${folder.split("/").map(encodeURIComponent).join("/")}`;
}

/** The relative URL from one output file to another, e.g. `../style.css`. */
export function relativeHref(fromFile: string, toFile: string): string {
  const from = fromFile.split("/").slice(0, -1);
  const to = toFile.split("/");
  let shared = 0;
  while (
    shared < from.length &&
    shared < to.length - 1 &&
    from[shared] === to[shared]
  ) {
    shared += 1;
  }
  return [...from.slice(shared).map(() => ".."), ...to.slice(shared)].join("/");
}
