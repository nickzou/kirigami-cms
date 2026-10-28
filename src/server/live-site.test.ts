import { describe, expect, it } from "vitest";
import { ConfigError, MemoryStore } from "../core/index.js";
import { createLiveSite } from "./live-site.js";

function setup(files: Record<string, string>) {
  const store = new MemoryStore(files);
  const built: { pages: number; recovered: boolean }[] = [];
  const problems: string[] = [];
  const hooks = {
    onBuilt: (f: readonly unknown[], recovered: boolean) =>
      built.push({ pages: f.length - 1, recovered }),
    onProblem: (m: string) => problems.push(m),
  };
  return { store, built, problems, hooks };
}

const html = (live: {
  files(): readonly { path: string; content: string }[];
}) => live.files().find((f) => f.path === "index.html")?.content;

describe("createLiveSite", () => {
  it("builds on creation and throws if that first build fails", async () => {
    const { store, hooks } = setup({ "index.md": "# One\n" });
    expect(html(await createLiveSite(store, hooks))).toContain("One");

    const bad = setup({ "site.yaml": "nope: 1\n" });
    await expect(createLiveSite(bad.store, bad.hooks)).rejects.toBeInstanceOf(
      ConfigError,
    );
  });

  it("picks up added, changed and removed pages on rebuild", async () => {
    const { store, built, hooks } = setup({ "index.md": "# One\n" });
    const live = await createLiveSite(store, hooks);

    const { version } = await store.read("index.md");
    await store.write("index.md", "# Two\n", version);
    await store.write("extra.md", "# Extra\n", null);
    await live.rebuild();
    expect(html(live)).toContain("Two");
    expect(built).toEqual([{ pages: 2, recovered: false }]);
  });

  it("keeps the last good build and reports a config error with its file and field", async () => {
    const { store, built, problems, hooks } = setup({ "index.md": "# One\n" });
    const live = await createLiveSite(store, hooks);

    await store.write("site.yaml", "theme:\n  colours: {}\n", null);
    await live.rebuild();
    expect(html(live)).toContain("One");
    expect(built).toEqual([]);
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain("site.yaml");
    expect(problems[0]).toContain("theme.colours");
  });

  it("keeps the last good build when pages collide", async () => {
    const { store, problems, hooks } = setup({ "about.md": "# A\n" });
    const live = await createLiveSite(store, hooks);
    await store.write("about/index.md", "# B\n", null);
    await live.rebuild();
    expect(problems[0]).toContain("about/index.html");
    expect(live.files().map((f) => f.path)).toContain("about/index.html");
  });

  it("reports recovery once the problem is fixed", async () => {
    const { store, built, hooks } = setup({ "index.md": "# One\n" });
    const live = await createLiveSite(store, hooks);
    await store.write("site.yaml", "nope: 1\n", null);
    await live.rebuild();

    const { version } = await store.read("site.yaml");
    await store.write("site.yaml", "", version);
    await live.rebuild();
    await live.rebuild();
    expect(built).toEqual([
      { pages: 1, recovered: true },
      { pages: 1, recovered: false },
    ]);
  });

  it("folds overlapping rebuilds into at most one more run", async () => {
    const { store, built, hooks } = setup({ "index.md": "# One\n" });
    const live = await createLiveSite(store, hooks);
    await Promise.all([live.rebuild(), live.rebuild(), live.rebuild()]);
    expect(built.length).toBeLessThanOrEqual(2);
    expect(built.length).toBeGreaterThanOrEqual(1);
  });
});
