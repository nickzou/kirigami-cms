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
    ]);
  });
});
