import { describe, expect, it } from "vitest";
import { defaultSiteConfig, renderPage } from "../../src/core/index.js";
import { pageToPreview, previewDocument } from "./preview-document.js";

const theme = defaultSiteConfig.theme;
const themed = { ...theme, colors: { ...theme.colors, link: "#9c27b0" } };

describe("previewDocument", () => {
  it("is a whole sample page with the theme's stylesheet when there is no real page", () => {
    const html = previewDocument(undefined, themed);
    expect(html).toMatch(/^<!doctype html>/);
    expect(html).toContain("--k-color-link: #9c27b0");
    expect(html).toContain("<h1>");
    expect(html).toContain("<table>");
  });

  it("puts the theme into a real page in place of its stylesheet link", () => {
    const real = renderPage({
      source: "# Real page\n\nSome text.\n",
      path: "index.md",
      stylesheet: "style.css",
    });
    const html = previewDocument(real, themed);
    expect(html).toContain("Real page");
    expect(html).toContain("--k-color-link: #9c27b0");
    expect(html).not.toContain('href="style.css"');
  });

  it("leaves out scripts, such as the dev server's reload script", () => {
    const real = renderPage({
      source: "# Hi\n",
      path: "index.md",
      stylesheet: "style.css",
    }).replace("</body>", "<script>alert(1)</script></body>");
    expect(previewDocument(real, theme)).not.toContain("<script");
  });

  it("falls back to the sample when the page has no stylesheet link to replace", () => {
    const html = previewDocument(
      "<html><body>not one of ours</body></html>",
      theme,
    );
    expect(html).not.toContain("not one of ours");
    expect(html).toContain("A page, as your readers see it");
  });

  it("keeps a $ in the stylesheet as it is (a replace string would change it)", () => {
    const real = renderPage({
      source: "# Hi\n",
      path: "index.md",
      stylesheet: "style.css",
    });
    const odd = { ...theme, fonts: { ...theme.fonts, body: "Price$&, serif" } };
    expect(previewDocument(real, odd)).toContain("Price$&, serif");
  });
});

describe("pageToPreview", () => {
  const page = (path: string) => ({ path, title: path, version: "v" });

  it("prefers the home page", () => {
    expect(pageToPreview([page("a.md"), page("index.md")])).toBe("index.md");
  });

  it("else takes the first page", () => {
    expect(pageToPreview([page("blog/a.md"), page("b.md")])).toBe("blog/a.md");
  });

  it("is undefined for no pages", () => {
    expect(pageToPreview([])).toBeUndefined();
  });
});
