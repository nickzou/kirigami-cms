import { describe, expect, it } from "vitest";
import { generateStylesheet } from "./css.js";
import { defaultSiteConfig, parseSiteConfig } from "./load.js";

const defaults = defaultSiteConfig.theme;
const themeFrom = (yaml: string) => parseSiteConfig(yaml, "site.yaml").theme;

describe("generateStylesheet", () => {
  it("is a pure function of the theme", () => {
    expect(generateStylesheet(defaults)).toBe(generateStylesheet(defaults));
  });

  it("produces a complete stylesheet with the default theme", () => {
    const css = generateStylesheet(defaults);
    for (const selector of [
      ":root",
      "body",
      "main",
      "h1",
      "h2",
      "h3",
      "h4",
      "h5",
      "h6",
      "p",
      "a",
      "a:hover",
      "ul",
      "ol",
      "li",
      "blockquote",
      "code",
      "pre",
      "pre code",
      "hr",
      "table",
      "th",
      "td",
      "img",
    ]) {
      expect(css, selector).toMatch(
        new RegExp(`(^|\\n)${selector.replace(/[:]/g, "\\:")}[ ,{]`),
      );
    }
  });

  it("defines every token as a CSS variable on :root", () => {
    const css = generateStylesheet(defaults);
    const root = css.slice(
      css.indexOf(":root"),
      css.indexOf("}", css.indexOf(":root")),
    );
    for (const name of [
      "--k-color-background",
      "--k-color-text",
      "--k-color-muted",
      "--k-color-link",
      "--k-color-border",
      "--k-color-code-background",
      "--k-font-body",
      "--k-font-heading",
      "--k-font-mono",
      "--k-font-size",
      "--k-line-height",
      "--k-space",
      "--k-max-width",
    ]) {
      expect(root, name).toContain(`${name}:`);
    }
  });

  it("writes configured values into the variables", () => {
    const css = generateStylesheet(
      themeFrom(`
theme:
  colors: { link: "#123456" }
  fonts: { body: 'Georgia, serif' }
  type: { baseSize: 18px, lineHeight: 1.5 }
  spacing: { unit: 1.25rem }
  layout: { maxWidth: 40rem }
`),
    );
    expect(css).toContain("--k-color-link: #123456;");
    expect(css).toContain("--k-font-body: Georgia, serif;");
    expect(css).toContain("--k-font-size: 18px;");
    expect(css).toContain("--k-line-height: 1.5;");
    expect(css).toContain("--k-space: 1.25rem;");
    expect(css).toContain("--k-max-width: 40rem;");
  });

  it("builds heading sizes from the base size and the scale", () => {
    const css = generateStylesheet(
      themeFrom("theme:\n  type:\n    scale: 2\n"),
    );
    expect(css).toMatch(
      /h1 \{[^}]*font-size: calc\(var\(--k-font-size\) \* 16\);/,
    );
    expect(css).toMatch(
      /h2 \{[^}]*font-size: calc\(var\(--k-font-size\) \* 8\);/,
    );
    expect(css).toMatch(
      /h4 \{[^}]*font-size: calc\(var\(--k-font-size\) \* 2\);/,
    );
  });

  it("rounds computed sizes to three decimals", () => {
    const css = generateStylesheet(
      themeFrom("theme:\n  type:\n    scale: 1.333\n"),
    );
    expect(css).toMatch(/h1 \{[^}]*\* 3\.157\);/);
  });

  it("uses variables, not literal values, in the element rules", () => {
    const css = generateStylesheet(
      themeFrom("theme:\n  colors: { link: '#123456' }\n"),
    );
    const afterRoot = css.slice(css.indexOf("}") + 1);
    expect(afterRoot).not.toContain("#123456");
    expect(afterRoot).toContain("var(--k-color-link)");
  });

  it("makes content wide-safe: images, code and tables cannot overflow", () => {
    const css = generateStylesheet(defaults);
    expect(css).toMatch(/img \{[^}]*max-width: 100%;/);
    expect(css).toMatch(/pre \{[^}]*overflow-x: auto;/);
    expect(css).toMatch(
      /\.table-wrap|table \{[^}]*(display: block|overflow-x: auto)/,
    );
  });
});
