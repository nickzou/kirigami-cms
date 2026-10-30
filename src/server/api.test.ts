import { describe, expect, it } from "vitest";
import { MemoryStore } from "../core/index.js";
import { createApiApp } from "./api.js";

function setup(files: Record<string, string> = {}) {
  const store = new MemoryStore(files);
  const app = createApiApp(store);
  const call = (
    path: string,
    init: RequestInit & { json?: unknown; host?: string } = {},
  ) => {
    const { json, host = "localhost", ...rest } = init;
    return app.request(`http://${host}${path}`, {
      ...rest,
      ...(json !== undefined && {
        body: JSON.stringify(json),
        headers: { "content-type": "application/json", ...rest.headers },
      }),
    });
  };
  return { store, call };
}

const enc = encodeURIComponent;

describe("GET /api/pages", () => {
  it("lists markdown pages with title and version, ignoring other files", async () => {
    const { store, call } = setup({
      "index.md": "# Home\n",
      "blog/hello-world.md": "No heading here\n",
      "site.yaml": "",
    });
    const res = await call("/api/pages");
    expect(res.status).toBe(200);
    const { pages } = (await res.json()) as {
      pages: { path: string; title: string; version: string }[];
    };
    expect(pages.map((p) => [p.path, p.title])).toEqual([
      ["blog/hello-world.md", "hello-world"],
      ["index.md", "Home"],
    ]);
    expect(pages[1]?.version).toBe((await store.read("index.md")).version);
  });

  it("lists an empty site", async () => {
    expect(await (await setup().call("/api/pages")).json()).toEqual({
      pages: [],
    });
  });
});

describe("GET /api/pages/{path}", () => {
  it("reads a page, with a slash in its path encoded as %2F", async () => {
    const { store, call } = setup({ "blog/hello.md": "# Hi\n" });
    const res = await call(`/api/pages/${enc("blog/hello.md")}`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      path: "blog/hello.md",
      content: "# Hi\n",
      version: (await store.read("blog/hello.md")).version,
      url: "/blog/hello/",
    });
  });

  it("returns 404 for a missing page", async () => {
    const res = await setup().call("/api/pages/nope.md");
    expect(res.status).toBe(404);
    expect(((await res.json()) as { error: { code: string } }).error.code).toBe(
      "not_found",
    );
  });

  it("returns 400 for paths that are not pages", async () => {
    const { call } = setup({ "site.yaml": "" });
    for (const path of [
      "site.yaml",
      "..%2Fsecret.md",
      "%2Fetc%2Fpasswd.md",
      "a%2F..%2Fb.md",
    ]) {
      const res = await call(`/api/pages/${path}`);
      expect(res.status, path).toBe(400);
      expect(
        ((await res.json()) as { error: { code: string } }).error.code,
      ).toBe("invalid_path");
    }
  });
});

describe("PUT /api/pages/{path}", () => {
  it("creates a page with version null and answers 201", async () => {
    const { store, call } = setup();
    const res = await call("/api/pages/new.md", {
      method: "PUT",
      json: { content: "# New\n", version: null },
    });
    expect(res.status).toBe(201);
    const body = (await res.json()) as { path: string; version: string };
    expect(body.version).toBe((await store.read("new.md")).version);
  });

  it("creates folders' pages by path", async () => {
    const { store, call } = setup();
    const res = await call(`/api/pages/${enc("blog/new.md")}`, {
      method: "PUT",
      json: { content: "x", version: null },
    });
    expect(res.status).toBe(201);
    expect((await store.read("blog/new.md")).content).toBe("x");
  });

  it("updates with the last-read version and answers 200", async () => {
    const { store, call } = setup({ "a.md": "# A\n" });
    const { version } = await store.read("a.md");
    const res = await call("/api/pages/a.md", {
      method: "PUT",
      json: { content: "# B\n", version },
    });
    expect(res.status).toBe(200);
    expect((await store.read("a.md")).content).toBe("# B\n");
  });

  it("stores content exactly as sent, CRLF, trailing spaces and raw HTML included", async () => {
    const { store, call } = setup();
    const content = "# T  \r\n\r\n<b>raw</b>  \r\n\ttab nbsp\r\n";
    await call("/api/pages/a.md", {
      method: "PUT",
      json: { content, version: null },
    });
    const read = await call("/api/pages/a.md");
    expect(((await read.json()) as { content: string }).content).toBe(content);
    expect((await store.read("a.md")).content).toBe(content);
  });

  it("answers 409 with the current version and writes nothing when the version is stale", async () => {
    const { store, call } = setup({ "a.md": "v1" });
    const stale = (await store.read("a.md")).version;
    await store.write("a.md", "v2", stale);
    const current = (await store.read("a.md")).version;

    const res = await call("/api/pages/a.md", {
      method: "PUT",
      json: { content: "mine", version: stale },
    });
    expect(res.status).toBe(409);
    const body = (await res.json()) as {
      error: { code: string };
      currentVersion: string | null;
    };
    expect(body.error.code).toBe("conflict");
    expect(body.currentVersion).toBe(current);
    expect((await store.read("a.md")).content).toBe("v2");
  });

  it("answers 409 when creating a page that already exists", async () => {
    const { store, call } = setup({ "a.md": "old" });
    const res = await call("/api/pages/a.md", {
      method: "PUT",
      json: { content: "new", version: null },
    });
    expect(res.status).toBe(409);
    expect((await store.read("a.md")).content).toBe("old");
  });

  it("answers 409 with currentVersion null when updating a page that is gone", async () => {
    const res = await setup().call("/api/pages/gone.md", {
      method: "PUT",
      json: { content: "x", version: "abc" },
    });
    expect(res.status).toBe(409);
    expect(
      ((await res.json()) as { currentVersion: null }).currentVersion,
    ).toBeNull();
  });

  it("answers 400 for bad paths and bad bodies, and 415 for a body that is not JSON, writing nothing", async () => {
    const { store, call } = setup();
    const put = (path: string, json: unknown) =>
      call(path, { method: "PUT", json });

    expect(
      (await put("/api/pages/notes.txt", { content: "x", version: null }))
        .status,
    ).toBe(400);
    expect(
      (await put("/api/pages/..%2Fx.md", { content: "x", version: null }))
        .status,
    ).toBe(400);
    expect(
      (await put("/api/pages/a.md", { content: 5, version: null })).status,
    ).toBe(400);
    expect((await put("/api/pages/a.md", { content: "x" })).status).toBe(400);
    const notJson = await call("/api/pages/a.md", {
      method: "PUT",
      body: "content=x",
      headers: { "content-type": "text/plain" },
    });
    expect(notJson.status).toBe(415);
    expect(await store.list()).toEqual([]);
  });
});

describe("PUT /api/pages/{path}: pages that would share an address", () => {
  it("refuses to create a page the build would refuse, writing nothing", async () => {
    const { store, call } = setup({ "about/index.md": "# About\n" });
    const res = await call(`/api/pages/${enc("about.md")}`, {
      method: "PUT",
      json: { content: "x", version: null },
    });
    expect(res.status).toBe(409);
    const body = (await res.json()) as {
      error: { code: string; message: string };
      currentVersion: string | null;
    };
    expect(body.error.code).toBe("collision");
    expect(body.error.message).toContain("about/index.md");
    expect(body.currentVersion).toBeNull();
    expect((await store.list()).map((e) => e.path)).toEqual(["about/index.md"]);
  });

  it("still creates a page that shares nothing", async () => {
    const { call } = setup({ "about/index.md": "# About\n" });
    const res = await call(`/api/pages/${enc("contact.md")}`, {
      method: "PUT",
      json: { content: "x", version: null },
    });
    expect(res.status).toBe(201);
  });
});

describe("DELETE /api/pages/{path}", () => {
  it("deletes a page with its current version and answers 204", async () => {
    const { store, call } = setup({
      "a.md": "# A\n",
      "b.md": "# B\n",
    });
    const version = (await store.read("a.md")).version;
    const res = await call(
      `/api/pages/${enc("a.md")}?version=${enc(version)}`,
      {
        method: "DELETE",
      },
    );
    expect(res.status).toBe(204);
    expect((await store.list()).map((e) => e.path)).toEqual(["b.md"]);
    expect((await call(`/api/pages/${enc("a.md")}`)).status).toBe(404);
  });

  it("deletes a page in a folder", async () => {
    const { store, call } = setup({ "blog/hello.md": "# Hi\n" });
    const version = (await store.read("blog/hello.md")).version;
    const res = await call(
      `/api/pages/${enc("blog/hello.md")}?version=${enc(version)}`,
      { method: "DELETE" },
    );
    expect(res.status).toBe(204);
    expect(await store.list()).toEqual([]);
  });

  it("answers 409 with the current version and keeps the page when the version is stale", async () => {
    const { store, call } = setup({ "a.md": "one" });
    const stale = (await store.read("a.md")).version;
    const { version: current } = await store.write("a.md", "two", stale);
    const res = await call(`/api/pages/${enc("a.md")}?version=${enc(stale)}`, {
      method: "DELETE",
    });
    expect(res.status).toBe(409);
    const body = (await res.json()) as {
      error: { code: string };
      currentVersion: string | null;
    };
    expect(body.error.code).toBe("conflict");
    expect(body.currentVersion).toBe(current);
    expect((await store.read("a.md")).content).toBe("two");
  });

  it("answers 404 for a page that does not exist", async () => {
    const res = await setup().call(`/api/pages/${enc("nope.md")}?version=1`, {
      method: "DELETE",
    });
    expect(res.status).toBe(404);
  });

  it("answers 400 without a version, and for paths that are not pages, deleting nothing", async () => {
    const { store, call } = setup({ "a.md": "x", "site.yaml": "y" });
    const noVersion = await call(`/api/pages/${enc("a.md")}`, {
      method: "DELETE",
    });
    expect(noVersion.status).toBe(400);
    const notAPage = await call(`/api/pages/${enc("site.yaml")}?version=1`, {
      method: "DELETE",
    });
    expect(notAPage.status).toBe(400);
    const outside = await call(`/api/pages/${enc("../a.md")}?version=1`, {
      method: "DELETE",
    });
    expect(outside.status).toBe(400);
    expect((await store.list()).map((e) => e.path)).toEqual([
      "a.md",
      "site.yaml",
    ]);
  });
});

describe("POST /api/pages/{path}/rename", () => {
  const rename = (
    call: ReturnType<typeof setup>["call"],
    from: string,
    json: unknown,
  ) => call(`/api/pages/${enc(from)}/rename`, { method: "POST", json });

  it("moves a page to a new path, creating folders, and answers 200 with the new path", async () => {
    const { store, call } = setup({ "a.md": "# A\n" });
    const version = (await store.read("a.md")).version;
    const res = await rename(call, "a.md", { to: "blog/2026/a.md", version });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ path: "blog/2026/a.md", version });
    expect((await store.list()).map((e) => e.path)).toEqual(["blog/2026/a.md"]);
    expect((await call(`/api/pages/${enc("a.md")}`)).status).toBe(404);
    expect((await call(`/api/pages/${enc("blog/2026/a.md")}`)).status).toBe(
      200,
    );
  });

  it("answers 409 with code exists and moves nothing when a page is already there", async () => {
    const { store, call } = setup({ "a.md": "a", "b.md": "b" });
    const version = (await store.read("a.md")).version;
    const res = await rename(call, "a.md", { to: "b.md", version });
    expect(res.status).toBe(409);
    const body = (await res.json()) as {
      error: { code: string };
      currentVersion: string | null;
    };
    expect(body.error.code).toBe("exists");
    expect(body.currentVersion).toBe(version);
    expect((await store.read("a.md")).content).toBe("a");
    expect((await store.read("b.md")).content).toBe("b");
  });

  it("answers 409 with code conflict and moves nothing when the version is stale", async () => {
    const { store, call } = setup({ "a.md": "one" });
    const stale = (await store.read("a.md")).version;
    await store.write("a.md", "two", stale);
    const res = await rename(call, "a.md", { to: "b.md", version: stale });
    expect(res.status).toBe(409);
    expect(((await res.json()) as { error: { code: string } }).error.code).toBe(
      "conflict",
    );
    expect((await store.list()).map((e) => e.path)).toEqual(["a.md"]);
  });

  it("answers 404 for a page that does not exist", async () => {
    const res = await rename(setup().call, "nope.md", {
      to: "b.md",
      version: "1",
    });
    expect(res.status).toBe(404);
  });

  it("answers 400 for a bad new path or body, moving nothing", async () => {
    const { store, call } = setup({ "a.md": "x" });
    const version = (await store.read("a.md")).version;
    for (const json of [
      { to: "../b.md", version },
      { to: "b.txt", version },
      { to: "", version },
      { to: "b.md" },
      { version },
    ]) {
      expect((await rename(call, "a.md", json)).status).toBe(400);
    }
    expect((await store.list()).map((e) => e.path)).toEqual(["a.md"]);
  });

  it("refuses a rename the build would refuse, with code collision", async () => {
    const { store, call } = setup({
      "about/index.md": "# About\n",
      "team.md": "# Team\n",
    });
    const version = (await store.read("team.md")).version;
    const res = await rename(call, "team.md", { to: "about.md", version });
    expect(res.status).toBe(409);
    const body = (await res.json()) as {
      error: { code: string; message: string };
    };
    expect(body.error.code).toBe("collision");
    expect(body.error.message).toContain("about/index.md");
    expect((await store.list()).map((e) => e.path)).toEqual([
      "about/index.md",
      "team.md",
    ]);
  });

  it("allows a rename that only looks like a collision with the page being moved", async () => {
    const { store, call } = setup({ "about.md": "# About\n" });
    const version = (await store.read("about.md")).version;
    const res = await rename(call, "about.md", {
      to: "about/index.md",
      version,
    });
    expect(res.status).toBe(200);
    expect((await store.list()).map((e) => e.path)).toEqual(["about/index.md"]);
  });
});

describe("/api/site-config", () => {
  const put = (call: ReturnType<typeof setup>["call"], json: unknown) =>
    call("/api/site-config", { method: "PUT", json });
  const link = (value: string | null) => ({
    path: ["theme", "colors", "link"],
    value,
  });
  const FILE = [
    "# a comment at the top",
    "theme:",
    "  colors:",
    '    link: "#9c27b0" # brand',
    "  layout:",
    "    maxWidth: 40rem",
    "",
  ].join("\n");

  describe("GET", () => {
    it("says there is no file yet, with no values", async () => {
      expect(await (await setup().call("/api/site-config")).json()).toEqual({
        content: "",
        version: null,
        values: {},
        error: null,
      });
    });

    it("gives the text, version and only the values the file sets, not defaults", async () => {
      const { store, call } = setup({ "site.yaml": FILE });
      const body = await (await call("/api/site-config")).json();
      expect(body).toEqual({
        content: FILE,
        version: (await store.read("site.yaml")).version,
        values: {
          theme: {
            colors: { link: "#9c27b0" },
            layout: { maxWidth: "40rem" },
          },
        },
        error: null,
      });
    });

    it("says why when the file is not valid, with no values", async () => {
      const { call } = setup({ "site.yaml": "nope: 1\n" });
      const body = (await (await call("/api/site-config")).json()) as {
        values: unknown;
        error: string;
        content: string;
      };
      expect(body.values).toBeNull();
      expect(body.error).toContain('Unknown key "nope"');
      expect(body.content).toBe("nope: 1\n");
    });
  });

  describe("PUT", () => {
    it("creates the file when there was none, and answers 200 with the new values", async () => {
      const { store, call } = setup();
      const res = await put(call, {
        changes: [link("#112233")],
        version: null,
      });
      expect(res.status).toBe(200);
      const body = (await res.json()) as { content: string; version: string };
      expect(body.content).toBe('theme:\n  colors:\n    link: "#112233"\n');
      expect(await store.read("site.yaml")).toEqual({
        content: body.content,
        version: body.version,
      });
    });

    it("changes a value and keeps the file's comments and the order of its keys", async () => {
      const { store, call } = setup({ "site.yaml": FILE });
      const version = (await store.read("site.yaml")).version;
      const res = await put(call, { changes: [link("#112233")], version });
      expect(res.status).toBe(200);
      expect((await store.read("site.yaml")).content).toBe(
        FILE.replace("#9c27b0", "#112233"),
      );
    });

    it("removes a setting, and the section it empties, so the default applies", async () => {
      const { store, call } = setup({ "site.yaml": FILE });
      const version = (await store.read("site.yaml")).version;
      const res = await put(call, {
        changes: [{ path: ["theme", "layout", "maxWidth"], value: null }],
        version,
      });
      expect(res.status).toBe(200);
      expect((await store.read("site.yaml")).content).toBe(
        [
          "# a comment at the top",
          "theme:",
          "  colors:",
          '    link: "#9c27b0" # brand',
          "",
        ].join("\n"),
      );
    });

    it("refuses a value the build would refuse, with the field named, writing nothing", async () => {
      const { store, call } = setup({ "site.yaml": FILE });
      const version = (await store.read("site.yaml")).version;
      const res = await put(call, { changes: [link("not a color!")], version });
      expect(res.status).toBe(400);
      const body = (await res.json()) as {
        error: { code: string; message: string };
      };
      expect(body.error.code).toBe("invalid_config");
      expect(body.error.message).toContain("theme.colors.link");
      expect((await store.read("site.yaml")).content).toBe(FILE);
    });

    it("refuses a setting that does not exist, and a value of the wrong kind", async () => {
      const { store, call } = setup({ "site.yaml": FILE });
      const version = (await store.read("site.yaml")).version;
      for (const change of [
        { path: ["theme", "colors", "bogus"], value: "#fff" },
        { path: ["theme", "type", "scale"], value: 9 },
        { path: ["nope"], value: "x" },
      ]) {
        expect((await put(call, { changes: [change], version })).status).toBe(
          400,
        );
      }
      expect((await store.read("site.yaml")).content).toBe(FILE);
    });

    it("answers 409 with the current version when the file changed since it was read", async () => {
      const { store, call } = setup({ "site.yaml": FILE });
      const stale = (await store.read("site.yaml")).version;
      const { version: current } = await store.write(
        "site.yaml",
        "theme:\n  layout:\n    maxWidth: 30rem\n",
        stale,
      );
      const res = await put(call, {
        changes: [link("#112233")],
        version: stale,
      });
      expect(res.status).toBe(409);
      const body = (await res.json()) as {
        error: { code: string };
        currentVersion: string | null;
      };
      expect(body.error.code).toBe("conflict");
      expect(body.currentVersion).toBe(current);
      expect((await store.read("site.yaml")).content).toContain("30rem");
    });

    it("answers 409 when it expected no file and there is one", async () => {
      const { call } = setup({ "site.yaml": FILE });
      const res = await put(call, {
        changes: [link("#112233")],
        version: null,
      });
      expect(res.status).toBe(409);
    });

    it("does not write when the changes leave the file as it is", async () => {
      const { store, call } = setup({ "site.yaml": FILE });
      const version = (await store.read("site.yaml")).version;
      const res = await put(call, {
        changes: [{ path: ["theme", "colors", "link"], value: "#9c27b0" }],
        version,
      });
      expect(res.status).toBe(200);
      expect(((await res.json()) as { version: string }).version).toBe(version);
    });

    it("answers 400 for a bad body, writing nothing", async () => {
      const { store, call } = setup({ "site.yaml": FILE });
      const version = (await store.read("site.yaml")).version;
      for (const json of [
        { version },
        { changes: [{ path: [], value: "x" }], version },
        { changes: [{ path: ["theme"], value: { a: 1 } }], version },
        { changes: "no", version },
      ]) {
        expect((await put(call, json)).status).toBe(400);
      }
      expect((await store.read("site.yaml")).content).toBe(FILE);
    });

    it("cannot change a file that is not valid YAML, and says why", async () => {
      const { call } = setup({ "site.yaml": "theme: [unclosed\n" });
      const body = (await (await call("/api/site-config")).json()) as {
        version: string;
      };
      const res = await put(call, {
        changes: [link("#112233")],
        version: body.version,
      });
      expect(res.status).toBe(400);
      expect(
        ((await res.json()) as { error: { message: string } }).error.message,
      ).toContain("site.yaml");
    });
  });
});

describe("local-only guard", () => {
  it("refuses requests addressed to another host name", async () => {
    const { call } = setup({ "a.md": "x" });
    for (const host of ["evil.example", "192.168.1.5:3000"]) {
      expect((await call("/api/pages", { host })).status, host).toBe(403);
    }
  });

  it("accepts localhost, 127.0.0.1 and ::1, with or without a port", async () => {
    const { call } = setup();
    for (const host of [
      "localhost",
      "localhost:3000",
      "127.0.0.1:3000",
      "[::1]:3000",
    ]) {
      expect((await call("/api/pages", { host })).status, host).toBe(200);
    }
  });

  it("refuses requests from another origin, and writes nothing", async () => {
    const { store, call } = setup();
    for (const origin of [
      "https://evil.example",
      "http://localhost:9999",
      "null",
    ]) {
      const res = await call("/api/pages/a.md", {
        method: "PUT",
        headers: { origin },
        json: { content: "x", version: null },
      });
      expect(res.status, origin).toBe(403);
    }
    expect(await store.list()).toEqual([]);
  });

  it("accepts a request from its own origin", async () => {
    const { call } = setup();
    const res = await call("/api/pages", {
      host: "localhost:3000",
      headers: { origin: "http://localhost:3000" },
    });
    expect(res.status).toBe(200);
  });
});

describe("OpenAPI document", () => {
  it("describes the pages routes", async () => {
    const res = await setup().call("/api/openapi.json");
    expect(res.status).toBe(200);
    const doc = (await res.json()) as {
      openapi: string;
      paths: Record<string, unknown>;
    };
    expect(doc.openapi).toBe("3.1.0");
    expect(Object.keys(doc.paths).sort()).toEqual([
      "/api/pages",
      "/api/pages/{path}",
      "/api/pages/{path}/rename",
      "/api/site-config",
    ]);
  });
});
