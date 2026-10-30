import { generateStylesheet } from "../../src/core/config/css.js";
import type { Theme } from "../../src/core/config/schema.js";
import type { PageSummary } from "./api.js";

/** A page that shows what the theme does: every kind of element it styles. */
const SAMPLE_BODY = `<main>
<h1>A page, as your readers see it</h1>
<p>Body text sits at the base size. It can hold <a href="#">a link</a>, <em>emphasis</em>, <strong>strong text</strong> and <code>inline code</code>.</p>
<h2>A second-level heading</h2>
<p>Each heading level steps up from the base size by the heading scale.</p>
<h3>A third-level heading</h3>
<ul><li>A list of things</li><li>With <a href="#">a link</a> inside</li></ul>
<blockquote><p>A quotation, set apart from the text around it.</p></blockquote>
<pre><code>const code = "in a block";</code></pre>
<table><thead><tr><th>Setting</th><th>Value</th></tr></thead><tbody><tr><td>Width</td><td>44rem</td></tr></tbody></table>
<h4>A fourth-level heading</h4>
<p>Muted text is used for the smallest headings and for quotations.</p>
<hr>
<p>The end of the page.</p>
</main>`;

const sampleDocument = (css: string): string =>
  `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Preview</title><style>${css}</style></head><body>${SAMPLE_BODY}</body></html>`;

const STYLESHEET_LINK = /<link rel="stylesheet" href="[^"]*">/;

/**
 * The HTML to show in the preview: a real page of the site with its stylesheet
 * replaced by one made from `theme`, or a sample page if there is no real one
 * (or it is not in the shape the build makes). Scripts are left out: the
 * preview frame cannot run them, and the page's dev reload script has no use.
 */
export function previewDocument(
  html: string | undefined,
  theme: Theme,
): string {
  const css = generateStylesheet(theme);
  if (html === undefined || !STYLESHEET_LINK.test(html)) {
    return sampleDocument(css);
  }
  return html
    .replace(/<script\b[\s\S]*?<\/script>/g, "")
    .replace(STYLESHEET_LINK, () => `<style>${css}</style>`);
}

/** The page to preview with: the home page if there is one, else the first. */
export function pageToPreview(
  pages: readonly PageSummary[],
): string | undefined {
  return (pages.find((page) => page.path === "index.md") ?? pages[0])?.path;
}
