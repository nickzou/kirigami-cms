import {
  cp,
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it, vi } from "vitest";
import { run } from "../src/cli/run.js";

const fixture = fileURLToPath(
  new URL("./fixtures/basic-site", import.meta.url),
);
const folders: string[] = [];

async function scratch(): Promise<string> {
  const folder = await mkdtemp(join(tmpdir(), "kirigami-cli-"));
  folders.push(folder);
  return folder;
}

async function site(): Promise<string> {
  const folder = join(await scratch(), "site");
  await cp(fixture, folder, { recursive: true });
  return folder;
}

function capture(cwd: string) {
  const out: string[] = [];
  const err: string[] = [];
  return {
    cwd,
    out: (l: string) => out.push(l),
    err: (l: string) => err.push(l),
    lines: { out, err },
  };
}

afterEach(async () => {
  await Promise.all(
    folders.splice(0).map((f) => rm(f, { recursive: true, force: true })),
  );
});

const exists = (path: string) =>
  readFile(path).then(
    () => true,
    () => false,
  );

describe("kirigami build", () => {
  it("builds the fixture site into <site>/dist", async () => {
    const dir = await site();
    const io = capture(dir);
    expect(await run(["build", "."], io)).toBe(0);
    expect(io.lines.out).toEqual([expect.stringContaining("Built 3 pages")]);

    const dist = join(dir, "dist");
    for (const file of [
      "index.html",
      "about/index.html",
      "blog/hello/index.html",
      "style.css",
    ]) {
      expect(await exists(join(dist, file)), file).toBe(true);
    }
  });

  it("renders the content and applies the site.yaml theme", async () => {
    const dir = await site();
    await run(["build", dir], capture(dir));
    const about = await readFile(join(dir, "dist/about/index.html"), "utf8");
    expect(about).not.toContain("__kirigami");
    expect(await exists(join(dir, "dist/admin/index.html"))).toBe(false);
    expect(await exists(join(dir, "dist/api"))).toBe(false);
    expect(about).toContain("<title>About</title>");
    expect(about).toContain("<strong>plain markdown</strong>");
    expect(about).toContain("<table>");
    expect(about).toContain('href="../style.css"');
    const css = await readFile(join(dir, "dist/style.css"), "utf8");
    expect(css).toContain("--k-color-link: #9c27b0;");
    expect(css).toContain("--k-max-width: 40rem;");
  });

  it("leaves the markdown source untouched", async () => {
    const dir = await site();
    const before = await readFile(join(dir, "about.md"), "utf8");
    await run(["build", dir], capture(dir));
    expect(await readFile(join(dir, "about.md"), "utf8")).toBe(before);
  });

  it("does not read its own output as pages when run again", async () => {
    const dir = await site();
    await run(["build", dir], capture(dir));
    const io = capture(dir);
    expect(await run(["build", dir], io)).toBe(0);
    expect(io.lines.out[0]).toContain("Built 3 pages");
  });

  it("writes to --out, resolved from the working directory", async () => {
    const dir = await site();
    const out = join(await scratch(), "public");
    expect(await run(["build", dir, "--out", out], capture(dir))).toBe(0);
    expect((await readdir(out)).sort()).toEqual([
      "about",
      "blog",
      "index.html",
      "style.css",
    ]);
  });

  it("resolves a relative site path from the working directory", async () => {
    const dir = await site();
    const io = capture(join(dir, ".."));
    expect(await run(["build", "site"], io)).toBe(0);
    expect(await exists(join(dir, "dist/index.html"))).toBe(true);
  });

  it("builds a folder with no site.yaml using the default theme", async () => {
    const dir = await scratch();
    await writeFile(join(dir, "index.md"), "# Hi\n");
    expect(await run(["build", dir], capture(dir))).toBe(0);
    expect(await readFile(join(dir, "dist/style.css"), "utf8")).toContain(
      "--k-color-link: #0b57d0;",
    );
  });

  it("exits 1 and writes nothing when site.yaml is invalid", async () => {
    const dir = await site();
    await writeFile(join(dir, "site.yaml"), "theme:\n  colours: {}\n");
    const io = capture(dir);
    expect(await run(["build", dir], io)).toBe(1);
    expect(io.lines.err.join("\n")).toContain("theme.colours");
    expect(await exists(join(dir, "dist/index.html"))).toBe(false);
  });

  it("exits 1 when two pages would collide", async () => {
    const dir = await site();
    await mkdir(join(dir, "about"));
    await writeFile(join(dir, "about/index.md"), "# Again\n");
    const io = capture(dir);
    expect(await run(["build", dir], io)).toBe(1);
    expect(io.lines.err.join("\n")).toContain("about/index.html");
  });

  it.each([".", ".."])(
    "refuses an output folder that is or contains the site (--out %s)",
    async (target) => {
      const dir = await site();
      const io = capture(dir);
      expect(await run(["build", dir, "--out", target], io)).toBe(2);
      expect(io.lines.err.join("\n")).toContain("Refusing");
      expect(await exists(join(dir, "dist/index.html"))).toBe(false);
    },
  );

  it("allows an output folder nested inside the site", async () => {
    const dir = await site();
    expect(
      await run(["build", dir, "--out", join(dir, "public/out")], capture(dir)),
    ).toBe(0);
    expect(await exists(join(dir, "public/out/index.html"))).toBe(true);
  });
});

describe("kirigami check", () => {
  it("passes for the fixture site and writes nothing", async () => {
    const dir = await site();
    const io = capture(dir);
    expect(await run(["check", dir], io)).toBe(0);
    expect(io.lines.out).toEqual(["OK: 3 pages, config valid."]);
    expect(await exists(join(dir, "dist/index.html"))).toBe(false);
  });

  it("exits 1 and lists every problem with its file and field", async () => {
    const dir = await site();
    await writeFile(
      join(dir, "site.yaml"),
      "theme:\n  colours: {}\n  layout:\n    maxWidth: wide\n",
    );
    const io = capture(dir);
    expect(await run(["check", dir], io)).toBe(1);
    const text = io.lines.err.join("\n");
    expect(text).toContain("Found 2 problems");
    expect(text).toContain("site.yaml (theme.colours)");
    expect(text).toContain("site.yaml (theme.layout.maxWidth)");
  });

  it("reports invalid YAML with its line", async () => {
    const dir = await site();
    await writeFile(join(dir, "site.yaml"), "theme:\n  colors: [\n");
    const io = capture(dir);
    expect(await run(["check", dir], io)).toBe(1);
    expect(io.lines.err.join("\n")).toMatch(/line \d+/);
  });
});

describe("usage", () => {
  it("prints help and exits 0 for --help", async () => {
    const io = capture("/");
    expect(await run(["--help"], io)).toBe(0);
    expect(io.lines.out.join("\n")).toContain("kirigami build <site>");
  });

  it.each([
    [[]],
    [["build"]],
    [["check"]],
    [["deploy", "x"]],
    [["build", "a", "b"]],
    [["check", "x", "--out", "y"]],
    [["build", "x", "--bogus"]],
  ])("exits 2 with usage for %j", async (argv) => {
    const io = capture("/");
    expect(await run(argv, io)).toBe(2);
    expect(io.lines.err.join("\n")).toContain("Usage:");
  });
});

describe("kirigami dev", () => {
  it("rejects a port that is not a number in range", async () => {
    const dir = await site();
    for (const port of ["abc", "-1", "70000", "3.5"]) {
      const io = capture(dir);
      expect(await run(["dev", dir, `--port=${port}`], io), port).toBe(2);
      expect(io.lines.err.join("\n")).toContain("--port must be");
    }
  });

  it("only accepts --port for dev and --out for build", async () => {
    const dir = await site();
    expect(await run(["build", dir, "--port", "1"], capture(dir))).toBe(2);
    expect(await run(["dev", dir, "--out", "x"], capture(dir))).toBe(2);
  });

  it("exits 1 with the config problem instead of serving a broken site", async () => {
    const dir = await site();
    await writeFile(join(dir, "site.yaml"), "nope: 1\n");
    const io = capture(dir);
    expect(await run(["dev", dir, "--port", "0"], io)).toBe(1);
    expect(io.lines.err.join("\n")).toContain("site.yaml");
  });

  it("serves the site, rebuilds on edits, and survives a broken config", async () => {
    const dir = await site();
    const abort = new AbortController();
    const io = { ...capture(dir), signal: abort.signal };
    try {
      expect(await run(["dev", dir, "--port=0"], io)).toBe(0);
      const url = /http:\/\/localhost:\d+\//.exec(io.lines.out.join("\n"))?.[0];
      expect(url).toBeDefined();
      const get = async (path: string) =>
        (await fetch(new URL(path, url))).text();
      await new Promise((r) => setTimeout(r, 100));

      expect(await get("/")).toContain("/__kirigami/client.js");
      const events = await fetch(new URL("/__kirigami/events", url));
      const reader = (events.body as ReadableStream<Uint8Array>).getReader();
      const nextEvent = async () =>
        new TextDecoder().decode((await reader.read()).value);

      await writeFile(join(dir, "index.md"), "# Brand new heading\n");
      expect(await nextEvent()).toContain('"reload"');
      await vi.waitFor(async () =>
        expect(await get("/")).toContain("Brand new heading"),
      );

      await writeFile(join(dir, "site.yaml"), "nope: 1\n");
      expect(await nextEvent()).toContain('"type":"error"');
      await vi.waitFor(() =>
        expect(io.lines.err.join("\n")).toContain(
          "Still serving the last good build",
        ),
      );
      expect(await get("/")).toContain("Brand new heading");

      await writeFile(join(dir, "site.yaml"), "");
      await vi.waitFor(() =>
        expect(io.lines.out.join("\n")).toContain("Fixed. Rebuilt"),
      );
      expect(await nextEvent()).toContain('"reload"');
      await reader.cancel();
    } finally {
      abort.abort();
    }
  });

  it("saves a page through the API, rebuilds it, and warns about hidden pages", async () => {
    const dir = await site();
    await writeFile(join(dir, "api.md"), "# Mine\n");
    const abort = new AbortController();
    const io = { ...capture(dir), signal: abort.signal };
    try {
      expect(await run(["dev", dir, "--port=0"], io)).toBe(0);
      expect(io.lines.err.join("\n")).toContain("/api/ is reserved");
      const url =
        /http:\/\/localhost:\d+\//.exec(io.lines.out.join("\n"))?.[0] ?? "";

      const page = await (
        await fetch(new URL("/api/pages/about.md", url))
      ).json();
      const res = await fetch(new URL("/api/pages/about.md", url), {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          content: "# Edited in the API\r\n",
          version: (page as { version: string }).version,
        }),
      });
      expect(res.status).toBe(200);
      expect(await readFile(join(dir, "about.md"), "utf8")).toBe(
        "# Edited in the API\r\n",
      );
      await vi.waitFor(async () =>
        expect(await (await fetch(new URL("/about/", url))).text()).toContain(
          "Edited in the API",
        ),
      );
      expect((await fetch(new URL("/api/nope", url))).status).toBe(404);
    } finally {
      abort.abort();
    }
  });
});
