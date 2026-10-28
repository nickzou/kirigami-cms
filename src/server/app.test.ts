import { describe, expect, it } from "vitest";
import { createSiteApp } from "./app.js";
import { createEventHub } from "./events.js";

const files = [
  { path: "index.html", content: "<h1>Home</h1>" },
  { path: "about/index.html", content: "<h1>About</h1>" },
  { path: "blog/hello/index.html", content: "<h1>Hello</h1>" },
  { path: "style.css", content: "body{}" },
];
const app = createSiteApp(() => files);
const get = (path: string, init?: RequestInit) =>
  app.request(`http://localhost${path}`, init);

describe("createSiteApp", () => {
  it("serves / as index.html", async () => {
    const res = await get("/");
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("<h1>Home</h1>");
    expect(res.headers.get("content-type")).toBe("text/html; charset=utf-8");
  });

  it("serves a folder URL as its index.html", async () => {
    expect(await (await get("/about/")).text()).toBe("<h1>About</h1>");
    expect(await (await get("/blog/hello/")).text()).toBe("<h1>Hello</h1>");
  });

  it("serves the stylesheet as CSS", async () => {
    const res = await get("/style.css");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("text/css; charset=utf-8");
  });

  it("redirects a folder URL without a trailing slash, keeping the query", async () => {
    const res = await get("/about?x=1");
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe("/about/?x=1");
  });

  it("returns a 404 page for unknown paths", async () => {
    for (const path of ["/nope", "/nope/", "/about/missing.css", "/%E0%A4%A"]) {
      const res = await get(path);
      expect(res.status).toBe(404);
      expect(res.headers.get("content-type")).toContain("text/html");
      expect(await res.text()).toContain("Not found");
    }
  });

  it("styles the 404 page with the site stylesheet, from any depth", async () => {
    for (const path of ["/nope", "/a/b/c/nope"]) {
      expect(await (await get(path)).text()).toContain(
        '<link rel="stylesheet" href="/style.css">',
      );
    }
  });

  it("does not expose index.html under a doubled path", async () => {
    expect((await get("/index.html")).status).toBe(200);
    expect((await get("/about/index.html/")).status).toBe(404);
  });

  it("only answers GET and HEAD", async () => {
    expect((await get("/", { method: "POST" })).status).toBe(405);
    expect((await get("/", { method: "HEAD" })).status).toBe(200);
  });

  it("asks for the files on every request", async () => {
    let current = [{ path: "index.html", content: "one" }];
    const live = createSiteApp(() => current);
    expect(await (await live.request("http://localhost/")).text()).toBe("one");
    current = [{ path: "index.html", content: "two" }];
    expect(await (await live.request("http://localhost/")).text()).toBe("two");
  });
});

describe("createSiteApp with live reload", () => {
  const live = () => {
    const hub = createEventHub();
    const app = createSiteApp(() => files, { hub });
    return {
      hub,
      get: (path: string) => app.request(`http://localhost${path}`),
    };
  };

  it("adds the script to pages, including the 404 page, before </body>", async () => {
    const { get } = live();
    const withBody = createSiteApp(
      () => [{ path: "index.html", content: "<body>Hi</body>" }],
      { hub: createEventHub() },
    );
    expect(await (await withBody.request("http://localhost/")).text()).toBe(
      '<body>Hi<script src="/__kirigami/client.js"></script></body>',
    );
    expect(await (await get("/")).text()).toContain("/__kirigami/client.js");
    expect(await (await get("/nope")).text()).toContain(
      "/__kirigami/client.js",
    );
  });

  it("leaves stylesheets alone", async () => {
    expect(await (await live().get("/style.css")).text()).toBe("body{}");
  });

  it("never adds the script without a hub", async () => {
    for (const path of ["/", "/about/", "/nope"]) {
      expect(await (await get(path)).text()).not.toContain("__kirigami");
    }
    expect((await get("/__kirigami/client.js")).status).toBe(404);
    expect((await get("/__kirigami/events")).status).toBe(404);
  });

  it("serves the client script as JavaScript", async () => {
    const res = await live().get("/__kirigami/client.js");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/javascript");
    expect(await res.text()).toContain("EventSource");
  });

  it("streams events to a tab, replaying a current error", async () => {
    const { hub, get } = live();
    hub.publish({ type: "error", message: "site.yaml (theme.colours): bad" });
    const res = await get("/__kirigami/events");
    expect(res.headers.get("content-type")).toContain("text/event-stream");

    const reader = (res.body as ReadableStream<Uint8Array>).getReader();
    const decoder = new TextDecoder();
    const next = async () => decoder.decode((await reader.read()).value);

    expect(await next()).toContain(
      'data: {"type":"error","message":"site.yaml (theme.colours): bad"}',
    );
    hub.publish({ type: "reload" });
    expect(await next()).toContain('data: {"type":"reload"}');
    await reader.cancel();
  });

  it("streams to several tabs at once", async () => {
    const { hub, get } = live();
    const readers = await Promise.all(
      [1, 2].map(async () =>
        ((await get("/__kirigami/events")).body as ReadableStream).getReader(),
      ),
    );
    hub.publish({ type: "reload" });
    for (const reader of readers) {
      expect(new TextDecoder().decode((await reader.read()).value)).toContain(
        '"reload"',
      );
      await reader.cancel();
    }
  });
});
