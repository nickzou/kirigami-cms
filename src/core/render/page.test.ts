import { describe, expect, it } from "vitest";
import { renderPage } from "./page.js";

const render = (source: string, path = "about.md") =>
  renderPage({ source, path, stylesheet: "style.css" });

describe("renderPage", () => {
  it("links a stylesheet that starts with / as is", () => {
    const html = renderPage({
      source: "# X\n",
      path: "404.md",
      stylesheet: "/style.css",
    });
    expect(html).toContain('<link rel="stylesheet" href="/style.css">');
  });

  it("returns a complete HTML document", () => {
    const html = render("# About\n\nHello.\n");
    expect(html.startsWith("<!doctype html>\n")).toBe(true);
    expect(html).toContain('<html lang="en">');
    expect(html).toContain('<meta charset="utf-8">');
    expect(html).toContain(
      '<meta name="viewport" content="width=device-width, initial-scale=1">',
    );
    expect(html).toContain("<h1>About</h1>");
    expect(html).toContain("<p>Hello.</p>");
    expect(html.endsWith("</html>\n")).toBe(true);
  });

  it("uses the first # heading as the title", () => {
    expect(render("# About us\n\ntext\n")).toContain("<title>About us</title>");
  });

  it("falls back to the file name when there is no # heading", () => {
    expect(render("just text\n", "blog/hello-world.md")).toContain(
      "<title>hello-world</title>",
    );
  });

  it("escapes the title", () => {
    const html = render('# A <b> & "c"\n');
    expect(html).toContain("<title>A &lt;b&gt; &amp; &quot;c&quot;</title>");
  });

  it("escapes a file-name title", () => {
    expect(render("text\n", "a&b.md")).toContain("<title>a&amp;b</title>");
  });

  it("links the stylesheet relative to the page's output location", () => {
    expect(render("# T\n", "index.md")).toContain('href="style.css"');
    expect(render("# T\n", "about.md")).toContain('href="../style.css"');
    expect(render("# T\n", "blog/hello.md")).toContain(
      'href="../../style.css"',
    );
  });

  it("does not let raw HTML in the page reach the document", () => {
    expect(render("<script>alert(1)</script>\n\n# T\n")).not.toContain(
      "<script",
    );
  });
});
