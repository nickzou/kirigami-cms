import { describe, expect, it } from "vitest";
import { findCollisions, pagesCollidingWith } from "./collisions.js";

describe("findCollisions", () => {
  it("finds pages that would be written to the same file", () => {
    expect(findCollisions(["about.md", "about/index.md", "blog/a.md"])).toEqual(
      [{ target: "about/index.html", pages: ["about.md", "about/index.md"] }],
    );
  });

  it("finds nothing when every page has its own file", () => {
    expect(findCollisions(["index.md", "about.md", "blog/index.md"])).toEqual(
      [],
    );
  });
});

describe("pagesCollidingWith", () => {
  const pages = ["about/index.md", "blog/a.md"];

  it("names the pages a new path would clash with", () => {
    expect(pagesCollidingWith("about.md", pages)).toEqual(["about/index.md"]);
    expect(pagesCollidingWith("blog/a/index.md", pages)).toEqual(["blog/a.md"]);
  });

  it("does not count the page itself", () => {
    expect(pagesCollidingWith("about/index.md", pages)).toEqual([]);
  });

  it("finds nothing for a path nothing else shares", () => {
    expect(pagesCollidingWith("contact.md", pages)).toEqual([]);
  });
});
