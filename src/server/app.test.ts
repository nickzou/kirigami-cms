import { describe, expect, it } from "vitest";
import { createSiteApp } from "./app.js";

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
