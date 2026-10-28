import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createAdminApp } from "./admin.js";
import { createSiteApp } from "./app.js";

const folders: string[] = [];
afterEach(async () => {
  await Promise.all(
    folders.splice(0).map((f) => rm(f, { recursive: true, force: true })),
  );
});

async function built() {
  const root = await mkdtemp(join(tmpdir(), "kirigami-admin-"));
  folders.push(root);
  const dir = join(root, "admin");
  await mkdir(join(dir, "assets"), { recursive: true });
  await writeFile(join(dir, "index.html"), "<h1>Admin</h1>");
  await writeFile(join(dir, "assets/app.js"), "console.log(1)");
  await writeFile(join(dir, "assets/app.css"), "body{}");
  await writeFile(join(root, "secret.txt"), "top secret");
  return { root, dir };
}

const get = (
  app: { request: (u: string) => Response | Promise<Response> },
  path: string,
) => app.request(`http://localhost${path}`);

describe("createAdminApp", () => {
  it("serves the app at /admin/ and redirects /admin to it", async () => {
    const app = createAdminApp((await built()).dir);
    const res = await get(app, "/admin/");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("text/html; charset=utf-8");
    expect(await res.text()).toBe("<h1>Admin</h1>");

    const redirect = await get(app, "/admin");
    expect(redirect.status).toBe(302);
    expect(redirect.headers.get("location")).toBe("/admin/");
  });

  it("serves assets with their content types", async () => {
    const app = createAdminApp((await built()).dir);
    const js = await get(app, "/admin/assets/app.js");
    expect(js.headers.get("content-type")).toBe(
      "text/javascript; charset=utf-8",
    );
    expect(await js.text()).toBe("console.log(1)");
    expect(
      (await get(app, "/admin/assets/app.css")).headers.get("content-type"),
    ).toBe("text/css; charset=utf-8");
  });

  it("gives deep links the app, so a reload on /admin/pages/x.md works", async () => {
    const app = createAdminApp((await built()).dir);
    for (const path of [
      "/admin/pages/blog/hello.md",
      "/admin/pages",
      "/admin/pages/a%20b",
    ]) {
      const res = await get(app, path);
      expect(res.status, path).toBe(200);
      expect(await res.text()).toBe("<h1>Admin</h1>");
    }
  });

  it("answers 404 for a missing file that has an extension", async () => {
    const app = createAdminApp((await built()).dir);
    expect((await get(app, "/admin/assets/missing.js")).status).toBe(404);
  });

  it("does not serve files outside the admin folder", async () => {
    const app = createAdminApp((await built()).dir);
    for (const path of [
      "/admin/..%2Fsecret.txt",
      "/admin/%2e%2e/secret.txt",
      "/admin/assets/..%2F..%2Fsecret.txt",
      "/admin/%2Fetc%2Fpasswd",
    ]) {
      const res = await get(app, path);
      expect(await res.text(), path).not.toContain("top secret");
    }
  });

  it("explains when the admin has not been built", async () => {
    const root = await mkdtemp(join(tmpdir(), "kirigami-admin-"));
    folders.push(root);
    const res = await get(createAdminApp(join(root, "missing")), "/admin/");
    expect(res.status).toBe(503);
    expect(await res.text()).toContain("pnpm build");
  });
});

describe("the admin inside the site app", () => {
  it("takes /admin ahead of the site and leaves the site's own pages alone", async () => {
    const { dir } = await built();
    const app = createSiteApp(
      () => [
        { path: "index.html", content: "<body>Home</body>" },
        { path: "admin/index.html", content: "<body>A site page</body>" },
      ],
      { admin: createAdminApp(dir) },
    );
    expect(await (await get(app, "/admin/")).text()).toBe("<h1>Admin</h1>");
    expect(await (await get(app, "/")).text()).toBe("<body>Home</body>");
  });

  it("does not add the live-reload script to the admin", async () => {
    const { dir } = await built();
    const { createEventHub } = await import("./events.js");
    const app = createSiteApp(() => [], {
      hub: createEventHub(),
      admin: createAdminApp(dir),
    });
    expect(await (await get(app, "/admin/")).text()).not.toContain(
      "__kirigami",
    );
  });
});
