import { describe, expect, it } from "vitest";
import { countPages, folderPaths, groupPages } from "./page-tree.js";

const page = (path: string) => ({ path, title: path, version: "v" });
const paths = (pages: { path: string }[]) => pages.map((p) => p.path);

describe("groupPages", () => {
  it("keeps pages at the top level as they are", () => {
    const tree = groupPages([page("b.md"), page("a.md")]);
    expect(tree.folders).toEqual([]);
    expect(paths(tree.pages)).toEqual(["a.md", "b.md"]);
  });

  it("puts a page in the folder its path names", () => {
    const tree = groupPages([page("index.md"), page("blog/hello.md")]);
    expect(paths(tree.pages)).toEqual(["index.md"]);
    expect(tree.folders.map((f) => [f.name, f.path])).toEqual([
      ["blog", "blog"],
    ]);
    expect(paths(tree.folders[0]?.pages ?? [])).toEqual(["blog/hello.md"]);
  });

  it("nests folders to any depth", () => {
    const tree = groupPages([page("docs/guides/start/install.md")]);
    const docs = tree.folders[0];
    const guides = docs?.folders[0];
    const start = guides?.folders[0];
    expect([docs?.path, guides?.path, start?.path]).toEqual([
      "docs",
      "docs/guides",
      "docs/guides/start",
    ]);
    expect(paths(start?.pages ?? [])).toEqual(["docs/guides/start/install.md"]);
    // A folder that holds only another folder has no pages of its own.
    expect(docs?.pages).toEqual([]);
  });

  it("makes one folder for many pages, and keeps a page and a folder of the same name apart", () => {
    const tree = groupPages([
      page("blog.md"),
      page("blog/a.md"),
      page("blog/b.md"),
    ]);
    expect(tree.folders).toHaveLength(1);
    expect(paths(tree.pages)).toEqual(["blog.md"]);
    expect(paths(tree.folders[0]?.pages ?? [])).toEqual([
      "blog/a.md",
      "blog/b.md",
    ]);
  });

  it("lists folders in order, ignoring case and reading numbers as numbers", () => {
    const tree = groupPages([
      page("b/x.md"),
      page("A/x.md"),
      page("chapter10/x.md"),
      page("chapter2/x.md"),
    ]);
    expect(tree.folders.map((f) => f.name)).toEqual([
      "A",
      "b",
      "chapter2",
      "chapter10",
    ]);
  });

  it("gives nothing for no pages", () => {
    expect(groupPages([])).toEqual({
      name: "",
      path: "",
      folders: [],
      pages: [],
    });
  });
});

describe("countPages", () => {
  it("counts a folder's pages and those in the folders inside it", () => {
    const tree = groupPages([
      page("index.md"),
      page("docs/a.md"),
      page("docs/guides/b.md"),
      page("docs/guides/c.md"),
    ]);
    expect(countPages(tree)).toBe(4);
    expect(countPages(tree.folders[0] as never)).toBe(3);
  });
});

describe("folderPaths", () => {
  it("lists every folder once, with the ones between, in order", () => {
    expect(
      folderPaths(["index.md", "docs/guides/a.md", "blog/b.md", "docs/c.md"]),
    ).toEqual(["blog", "docs", "docs/guides"]);
    expect(folderPaths(["index.md"])).toEqual([]);
  });
});
