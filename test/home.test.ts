import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { expandHome } from "../src/cli/home.js";

describe("expandHome", () => {
  const home = join("/", "home", "me");

  it("expands a leading ~/ and a lone ~", () => {
    expect(expandHome("~/Sites/blog", home)).toBe(join(home, "Sites", "blog"));
    expect(expandHome("~", home)).toBe(home);
  });

  it("leaves everything else alone", () => {
    expect(expandHome("./content", home)).toBe("./content");
    expect(expandHome("/abs/~/x", home)).toBe("/abs/~/x");
    expect(expandHome("~other/x", home)).toBe("~other/x");
    expect(expandHome("a/~", home)).toBe("a/~");
  });
});

describe("a ~ in the project config", () => {
  it("is the home folder for the content and the build output", async () => {
    const { mkdtemp, writeFile } = await import("node:fs/promises");
    const { tmpdir } = await import("node:os");
    const { resolveProject } = await import("../src/cli/project.js");
    const { vi } = await import("vitest");
    const project = await mkdtemp(join(tmpdir(), "kirigami-home-"));
    await writeFile(
      join(project, "kirigami.config.yaml"),
      "content:\n  store: local-folder\n  path: ~/Sites/blog\nbuild:\n  out: ~/Sites/blog-out\n",
    );
    vi.stubEnv("HOME", "/home/me");
    try {
      const resolved = await resolveProject(project, undefined, undefined);
      expect(resolved.content).toEqual({
        store: "local-folder",
        path: join("/home/me", "Sites", "blog"),
      });
      expect(resolved.outDir).toBe(join("/home/me", "Sites", "blog-out"));
    } finally {
      vi.unstubAllEnvs();
    }
  });
});
