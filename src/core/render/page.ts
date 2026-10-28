import { firstHeading, renderMarkdown } from "./markdown.js";
import { outputPath, relativeHref } from "./paths.js";

export interface RenderPageInput {
  /** The page's markdown. */
  source: string;
  /** Store path of the page, e.g. `blog/hello.md`. */
  path: string;
  /**
   * Output path of the stylesheet, e.g. `style.css`, linked relative to the
   * page. A path starting with `/` is linked as is, for pages served at
   * addresses that don't match their path (such as a 404).
   */
  stylesheet: string;
}

const escapeHtml = (text: string): string =>
  text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

/** Wraps a rendered page in the built-in HTML document. */
export function renderPage({
  source,
  path,
  stylesheet,
}: RenderPageInput): string {
  const fileName = path.slice(path.lastIndexOf("/") + 1).replace(/\.md$/, "");
  const title = firstHeading(source) ?? fileName;
  const href = stylesheet.startsWith("/")
    ? stylesheet
    : relativeHref(outputPath(path), stylesheet);

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<link rel="stylesheet" href="${escapeHtml(href)}">
</head>
<body>
<main>
${renderMarkdown(source)}
</main>
</body>
</html>
`;
}
