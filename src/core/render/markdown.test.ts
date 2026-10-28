import { describe, expect, it } from "vitest";
import { firstHeading, renderMarkdown } from "./markdown.js";

describe("renderMarkdown", () => {
  it("renders CommonMark", () => {
    expect(renderMarkdown("# Title\n\nSome *text*.\n")).toBe(
      "<h1>Title</h1>\n<p>Some <em>text</em>.</p>",
    );
  });

  it("renders GFM tables", () => {
    const html = renderMarkdown("| a | b |\n|---|---|\n| 1 | 2 |\n");
    expect(html).toContain("<table>");
    expect(html).toContain("<th>a</th>");
    expect(html).toContain("<td>2</td>");
  });

  it("renders GFM task lists as disabled checkboxes", () => {
    const html = renderMarkdown("- [x] done\n- [ ] todo\n");
    expect(html).toContain('type="checkbox"');
    expect(html).toContain("disabled");
    expect(html).toContain("checked");
  });

  it("renders GFM strikethrough and autolinks", () => {
    const html = renderMarkdown("~~gone~~ and https://example.com\n");
    expect(html).toContain("<del>gone</del>");
    expect(html).toContain(
      '<a href="https://example.com">https://example.com</a>',
    );
  });

  it("renders fenced code with its language class", () => {
    const html = renderMarkdown("```ts\nconst x = 1;\n```\n");
    expect(html).toContain('<code class="language-ts">const x = 1;\n</code>');
  });

  it("returns an empty string for empty input", () => {
    expect(renderMarkdown("")).toBe("");
  });

  describe("raw HTML is omitted", () => {
    it("drops block HTML", () => {
      expect(renderMarkdown('<div class="x">hi</div>\n\nafter\n')).toBe(
        "<p>after</p>",
      );
    });

    it("drops inline HTML but keeps the surrounding text", () => {
      const html = renderMarkdown("a <b>bold</b> word\n");
      expect(html).not.toContain("<b>");
      expect(html).toContain("a ");
      expect(html).toContain(" word");
    });

    it("drops script tags", () => {
      const html = renderMarkdown("<script>alert(1)</script>\n\ntext\n");
      expect(html).not.toContain("script");
      expect(html).not.toContain("alert");
    });

    it("drops HTML comments", () => {
      expect(renderMarkdown("<!-- secret -->\n\ntext\n")).toBe("<p>text</p>");
    });
  });

  describe("unsafe links and images", () => {
    it("removes javascript: link targets", () => {
      expect(renderMarkdown("[x](javascript:alert(1))\n")).not.toContain(
        "javascript",
      );
    });

    it("removes javascript: image sources", () => {
      expect(renderMarkdown("![x](javascript:alert(1))\n")).not.toContain(
        "javascript",
      );
    });

    it("keeps http, https, mailto and relative links", () => {
      const html = renderMarkdown(
        "[a](https://x.test) [b](http://x.test) [c](mailto:a@x.test) [d](../other/)\n",
      );
      for (const href of [
        "https://x.test",
        "http://x.test",
        "mailto:a@x.test",
        "../other/",
      ]) {
        expect(html).toContain(`href="${href}"`);
      }
    });
  });
});

describe("firstHeading", () => {
  it("returns the plain text of the first # heading", () => {
    expect(firstHeading("intro\n\n# My *page*\n\n# Second\n")).toBe("My page");
  });

  it("ignores ## and deeper headings", () => {
    expect(firstHeading("## Not it\n\n### Nor this\n")).toBeUndefined();
  });

  it("ignores a # inside a code block", () => {
    expect(firstHeading("```\n# nope\n```\n")).toBeUndefined();
  });

  it("returns undefined when the heading is empty", () => {
    expect(firstHeading("#\n\ntext\n")).toBeUndefined();
  });
});
