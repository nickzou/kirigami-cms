import {
  cp,
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  rm,
  stat,
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
    expect(io.lines.out.join("\n")).toContain("kirigami build [site]");
  });

  it.each([
    [[]],
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

describe("project configuration (kirigami.config.yaml)", () => {
  const page = "# From the config\n";

  /** A project: a config file in its root, and pages where the config says. */
  async function project(config: string, pages = "pages") {
    const root = await scratch();
    await writeFile(join(root, "kirigami.config.yaml"), config);
    await mkdir(join(root, pages), { recursive: true });
    await writeFile(join(root, pages, "index.md"), page);
    return root;
  }

  it("builds the content the config names, into the folder it names", async () => {
    const root = await project(
      "content:\n  store: local-folder\n  path: ./pages\nbuild:\n  out: ./public\n",
    );
    const io = capture(root);
    expect(await run(["build"], io)).toBe(0);
    expect(await readFile(join(root, "public/index.html"), "utf8")).toContain(
      "From the config",
    );
    // It says where the content came from, so it is never a surprise.
    expect(io.lines.out.join("\n")).toContain("Content: pages");
    expect(io.lines.out.join("\n")).toContain("kirigami.config.yaml");
  });

  it("is found from a folder inside the project", async () => {
    const root = await project(
      "content:\n  store: local-folder\n  path: ./pages\n",
    );
    const inside = join(root, "pages");
    expect(await run(["check"], capture(inside))).toBe(0);
    expect(await run(["build"], capture(inside))).toBe(0);
    // The output folder is relative to the config file, not to where it was run.
    expect(await exists(join(root, "dist/index.html"))).toBe(true);
  });

  it("uses ./pages-style defaults: ./content and ./dist when the config says nothing", async () => {
    const root = await project("{}\n", "content");
    expect(await run(["build"], capture(root))).toBe(0);
    expect(await exists(join(root, "dist/index.html"))).toBe(true);
  });

  it("lets a site folder on the command line win, and builds it into <site>/dist as before", async () => {
    const root = await project(
      "content:\n  store: local-folder\n  path: ./pages\n",
    );
    const other = join(root, "other");
    await mkdir(other);
    await writeFile(join(other, "index.md"), "# Other\n");
    expect(await run(["build", "other"], capture(root))).toBe(0);
    expect(await readFile(join(other, "dist/index.html"), "utf8")).toContain(
      "Other",
    );
    expect(await exists(join(root, "dist/index.html"))).toBe(false);
  });

  it("lets --out override the config, resolved from the working directory", async () => {
    const root = await project(
      "content:\n  store: local-folder\n  path: ./pages\n",
    );
    expect(await run(["build", "--out", "elsewhere"], capture(root))).toBe(0);
    expect(await exists(join(root, "elsewhere/index.html"))).toBe(true);
    expect(await exists(join(root, "dist/index.html"))).toBe(false);
  });

  it("serves content in a folder outside the project, by a relative or an absolute path", async () => {
    const parent = await scratch();
    const elsewhere = join(parent, "elsewhere");
    await mkdir(elsewhere);
    await writeFile(join(elsewhere, "index.md"), "# Outside the project\n");
    const root = join(parent, "project");
    await mkdir(root);

    for (const path of ["../elsewhere", elsewhere]) {
      await writeFile(
        join(root, "kirigami.config.yaml"),
        `content:\n  store: local-folder\n  path: ${path}\n`,
      );
      const io = capture(root);
      expect(await run(["check"], io), path).toBe(0);
      expect(io.lines.out.join("\n")).toContain("1 page");
      expect(await run(["build"], capture(root)), path).toBe(0);
      // The site is built beside the config, not into the content folder.
      expect(await exists(join(root, "dist/index.html")), path).toBe(true);
      expect(await exists(join(elsewhere, "dist"))).toBe(false);
    }
  });

  it("uses ./content when there is no config and no site", async () => {
    const root = await scratch();
    await mkdir(join(root, "content"));
    await writeFile(join(root, "content/index.md"), "# Default\n");
    const io = capture(root);
    expect(await run(["build"], io)).toBe(0);
    expect(await exists(join(root, "content/dist/index.html"))).toBe(true);
    expect(io.lines.out.join("\n")).toContain("the default");
  });

  it("says which store it does not know, and exits 1 without building", async () => {
    const root = await project("content:\n  store: google-drive\n");
    const io = capture(root);
    expect(await run(["build"], io)).toBe(1);
    const message = io.lines.err.join("\n");
    expect(message).toContain("kirigami.config.yaml");
    expect(message).toContain("content.store");
    expect(message).toContain("local-folder");
    expect(await exists(join(root, "dist"))).toBe(false);
  });

  it("exits 1 on an unknown key in the config", async () => {
    const root = await project("nope: 1\n");
    const io = capture(root);
    expect(await run(["check"], io)).toBe(1);
    expect(io.lines.err.join("\n")).toContain('Unknown key "nope"');
  });

  it("serves the content the config names, with the admin API over it", async () => {
    const root = await project(
      "content:\n  store: local-folder\n  path: ./pages\n",
    );
    const abort = new AbortController();
    const io = { ...capture(root), signal: abort.signal };
    try {
      expect(await run(["dev", "--port=0"], io)).toBe(0);
      const url = /http:\/\/localhost:\d+\//.exec(io.lines.out.join("\n"))?.[0];
      expect(url).toBeDefined();
      expect(await (await fetch(new URL("/", url))).text()).toContain(
        "From the config",
      );
      const pages = (await (
        await fetch(new URL("/api/pages", url))
      ).json()) as {
        pages: { path: string }[];
      };
      expect(pages.pages.map((p) => p.path)).toEqual(["index.md"]);
    } finally {
      abort.abort();
    }
  });

  it("makes the default ./content when serving and it does not exist yet", async () => {
    const root = await scratch();
    const abort = new AbortController();
    const io = { ...capture(root), signal: abort.signal };
    try {
      expect(await run(["dev", "--port=0"], io)).toBe(0);
      expect(io.lines.out.join("\n")).toContain("Made content");
      expect((await stat(join(root, "content"))).isDirectory()).toBe(true);
    } finally {
      abort.abort();
    }
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
      // Events come one per message. A change on disk is told at once (a
      // "changed" event), then the build says how it went; this reads the
      // next build event (of the kind asked for, since a file can be reported
      // twice and so rebuilt twice), remembering which changes it passed over.
      let pending = "";
      let changes = 0;
      const nextEvent = async (kind: "reload" | "error"): Promise<string> => {
        for (;;) {
          const end = pending.indexOf("\n\n");
          if (end !== -1) {
            const message = pending.slice(0, end);
            pending = pending.slice(end + 2);
            if (message.includes('"changed"')) {
              changes += 1;
              continue;
            }
            if (message.includes(`"type":"${kind}"`)) return message;
          }
          const chunk = new TextDecoder().decode((await reader.read()).value);
          pending += chunk;
        }
      };

      await writeFile(join(dir, "index.md"), "# Brand new heading\n");
      expect(await nextEvent("reload")).toContain('"reload"');
      await vi.waitFor(async () =>
        expect(await get("/")).toContain("Brand new heading"),
      );

      await writeFile(join(dir, "site.yaml"), "nope: 1\n");
      expect(await nextEvent("error")).toContain('"type":"error"');
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
      expect(await nextEvent("reload")).toContain('"reload"');
      // Each edit was told as a change too, whether or not the build was good.
      expect(changes).toBeGreaterThanOrEqual(2);
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
