import { describe, expect, it } from "vitest";
import { ConfigError } from "../config/load.js";
import { MemoryStore } from "../store/memory.js";
import { BuildError, buildSite, checkSite, isSourcePath } from "./site.js";

const byPath = (files: { path: string; content: string }[]) =>
  Object.fromEntries(files.map((f) => [f.path, f.content]));

describe("buildSite", () => {
  it("renders every markdown page to its clean-URL path, plus the stylesheet", async () => {
    const store = new MemoryStore({
      "index.md": "# Home\n",
      "about.md": "# About\n",
      "blog/index.md": "# Blog\n",
      "blog/hello.md": "# Hello\n",
    });
    const files = await buildSite(store);
    expect(files.map((f) => f.path)).toEqual([
      "about/index.html",
      "blog/hello/index.html",
      "blog/index.html",
      "index.html",
      "style.css",
    ]);
  });

  it("links each page to the stylesheet relative to itself", async () => {
    const store = new MemoryStore({
      "index.md": "# H\n",
      "blog/hello.md": "# B\n",
    });
    const out = byPath(await buildSite(store));
    expect(out["index.html"]).toContain('href="style.css"');
    expect(out["blog/hello/index.html"]).toContain('href="../../style.css"');
  });

  it("ignores files that are not markdown", async () => {
    const store = new MemoryStore({
      "index.md": "# H\n",
      "notes.txt": "x",
      "site.yaml": "",
    });
    expect((await buildSite(store)).map((f) => f.path)).toEqual([
      "index.html",
      "style.css",
    ]);
  });

  it("builds a site with no pages: just the stylesheet", async () => {
    expect((await buildSite(new MemoryStore())).map((f) => f.path)).toEqual([
      "style.css",
    ]);
  });

  it("styles the site from site.yaml", async () => {
    const store = new MemoryStore({
      "index.md": "# H\n",
      "site.yaml": "theme:\n  colors:\n    link: '#123456'\n",
    });
    expect(byPath(await buildSite(store))["style.css"]).toContain(
      "--k-color-link: #123456;",
    );
  });

  it("uses the default theme when there is no site.yaml", async () => {
    const out = byPath(
      await buildSite(new MemoryStore({ "index.md": "# H\n" })),
    );
    expect(out["style.css"]).toContain("--k-color-link: #0b57d0;");
  });

  it("never changes the markdown source", async () => {
    const store = new MemoryStore({
      "index.md": "# H\r\n\r\n<b>raw</b>  \r\n",
    });
    const before = await store.read("index.md");
    await buildSite(store);
    expect(await store.read("index.md")).toEqual(before);
  });

  it("throws ConfigError, naming site.yaml and the field, for a bad config", async () => {
    const store = new MemoryStore({ "site.yaml": "theme:\n  colours: {}\n" });
    const error = await buildSite(store).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ConfigError);
    expect((error as ConfigError).message).toContain("site.yaml");
    expect((error as ConfigError).message).toContain("theme.colours");
  });

  it("throws BuildError when two pages would write the same file", async () => {
    const store = new MemoryStore({
      "about.md": "# A\n",
      "about/index.md": "# B\n",
    });
    const error = await buildSite(store).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(BuildError);
    expect((error as BuildError).message).toContain("about.md");
    expect((error as BuildError).message).toContain("about/index.md");
    expect((error as BuildError).message).toContain("about/index.html");
  });
});

describe("checkSite", () => {
  it("reports no problems for a valid site and counts its pages", async () => {
    const store = new MemoryStore({
      "index.md": "# H\n",
      "a.md": "# A\n",
      "site.yaml": "",
    });
    expect(await checkSite(store)).toEqual({ pages: 2, problems: [] });
  });

  it("accepts a site with no site.yaml", async () => {
    expect(
      (await checkSite(new MemoryStore({ "index.md": "x" }))).problems,
    ).toEqual([]);
  });

  it("reports each config problem with its file and field", async () => {
    const store = new MemoryStore({
      "site.yaml": "theme:\n  colours: {}\n  layout:\n    maxWidth: wide\n",
    });
    const { problems } = await checkSite(store);
    expect(problems.map((p) => p.file)).toEqual(["site.yaml", "site.yaml"]);
    expect(problems.map((p) => p.path).sort()).toEqual([
      "theme.colours",
      "theme.layout.maxWidth",
    ]);
  });

  it("reports colliding pages", async () => {
    const store = new MemoryStore({ "about.md": "x", "about/index.md": "y" });
    const { problems } = await checkSite(store);
    expect(problems).toHaveLength(1);
    expect(problems[0]?.message).toContain("about/index.html");
  });

  it("reports config and collision problems together", async () => {
    const store = new MemoryStore({
      "site.yaml": "nope: 1\n",
      "about.md": "x",
      "about/index.md": "y",
    });
    expect((await checkSite(store)).problems).toHaveLength(2);
  });

  it("does not write anything", async () => {
    const store = new MemoryStore({ "index.md": "# H\n" });
    const before = await store.list();
    await checkSite(store);
    expect(await store.list()).toEqual(before);
  });
});

describe("isSourcePath", () => {
  it("is true for markdown pages and the site config only", () => {
    expect(isSourcePath("index.md")).toBe(true);
    expect(isSourcePath("blog/hello.md")).toBe(true);
    expect(isSourcePath("site.yaml")).toBe(true);
    expect(isSourcePath("blog/site.yaml")).toBe(false);
    expect(isSourcePath("index.md~")).toBe(false);
    expect(isSourcePath(".index.md.swp")).toBe(false);
    expect(isSourcePath("logo.png")).toBe(false);
  });
});
