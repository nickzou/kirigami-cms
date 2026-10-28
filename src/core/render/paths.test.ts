import { describe, expect, it } from "vitest";
import { outputPath, relativeHref } from "./paths.js";

describe("outputPath", () => {
  it.each([
    ["index.md", "index.html"],
    ["about.md", "about/index.html"],
    ["blog/index.md", "blog/index.html"],
    ["blog/hello.md", "blog/hello/index.html"],
    ["a/b/c.md", "a/b/c/index.html"],
  ])("maps %s to %s", (source, expected) => {
    expect(outputPath(source)).toBe(expected);
  });

  it("rejects a file that is not markdown", () => {
    expect(() => outputPath("image.png")).toThrow(/\.md/);
  });

  it("rejects an invalid store path", () => {
    expect(() => outputPath("../x.md")).toThrow(/Invalid path/);
  });
});

describe("relativeHref", () => {
  it.each([
    ["index.html", "style.css", "style.css"],
    ["about/index.html", "style.css", "../style.css"],
    ["blog/hello/index.html", "style.css", "../../style.css"],
    ["blog/index.html", "assets/site.css", "../assets/site.css"],
    ["blog/index.html", "blog/other.css", "other.css"],
  ])("from %s to %s is %s", (from, to, expected) => {
    expect(relativeHref(from, to)).toBe(expected);
  });
});
