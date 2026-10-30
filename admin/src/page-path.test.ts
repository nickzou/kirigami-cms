import { describe, expect, it } from "vitest";
import { normalizePagePath, pathProblem, starterContent } from "./page-path.js";

describe("normalizePagePath", () => {
  it("adds .md when it is left out, and keeps it when it is there", () => {
    expect(normalizePagePath("blog/hello")).toBe("blog/hello.md");
    expect(normalizePagePath("blog/hello.md")).toBe("blog/hello.md");
  });

  it("drops spaces around the path and a leading slash", () => {
    expect(normalizePagePath("  /blog/hello  ")).toBe("blog/hello.md");
  });

  it("leaves an empty path empty, so it can be reported", () => {
    expect(normalizePagePath("   ")).toBe("");
  });
});

describe("pathProblem", () => {
  const others = ["index.md", "about/index.md"];

  it("accepts a path nothing else uses", () => {
    expect(pathProblem("blog/hello.md", others)).toBeUndefined();
  });

  it("asks for a path when there is none", () => {
    expect(pathProblem("", others)).toContain("Enter a path");
  });

  it("explains an invalid path", () => {
    expect(pathProblem("../escape.md", others)).toContain("not allowed");
    expect(pathProblem("a//b.md", others)).toContain("empty segment");
  });

  it("refuses a path a page already has", () => {
    expect(pathProblem("index.md", others)).toBe(
      "A page already exists at index.md.",
    );
  });

  it("refuses a path the build would refuse, naming the other page", () => {
    expect(pathProblem("about.md", others)).toContain("about/index.md");
  });
});

describe("starterContent", () => {
  it("makes a heading from the file name", () => {
    expect(starterContent("blog/hello-world.md")).toBe("# Hello world\n");
    expect(starterContent("my_page.md")).toBe("# My page\n");
  });

  it("calls the home page Home", () => {
    expect(starterContent("index.md")).toBe("# Home\n");
  });
});
