import { readFile } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";
import { Hono } from "hono";

const CONTENT_TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".txt": "text/plain; charset=utf-8",
  ".map": "application/json; charset=utf-8",
};

const NOT_BUILT = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>Admin not built</title></head>
<body><h1>The admin is not built</h1><p>Run <code>pnpm build</code>, then start the dev server again.</p></body></html>
`;

const isMissing = (error: unknown): boolean =>
  error instanceof Error &&
  ["ENOENT", "EISDIR", "ENOTDIR"].includes(
    (error as NodeJS.ErrnoException).code ?? "",
  );

/**
 * Serves the built admin app at `/admin`. Addresses with no file behind them
 * (other than missing assets) get `index.html`, so links into the app work on
 * reload.
 */
export function createAdminApp(dir: string) {
  const root = resolve(dir);
  const app = new Hono();

  app.get("/admin", (c) => c.redirect("/admin/", 302));

  app.get("/admin/*", async (c) => {
    let relative: string;
    try {
      relative = decodeURIComponent(c.req.path.slice("/admin/".length));
    } catch {
      return c.text("Not found", 404);
    }

    const file = resolve(root, relative === "" ? "index.html" : relative);
    if (file !== root && !file.startsWith(root + sep)) {
      return c.text("Not found", 404);
    }

    const send = async (path: string) =>
      c.body(new Uint8Array(await readFile(path)), 200, {
        "Content-Type":
          CONTENT_TYPES[extname(path)] ?? "application/octet-stream",
      });

    try {
      return await send(file);
    } catch (error) {
      if (!isMissing(error)) throw error;
    }

    // A missing asset is a real 404. Anything else is a route in the app, and
    // page paths end in .md, so an extension alone does not mean a file.
    const type = extname(file);
    if (type !== ".html" && type in CONTENT_TYPES) {
      return c.text("Not found", 404);
    }
    try {
      return await send(resolve(root, "index.html"));
    } catch (error) {
      if (!isMissing(error)) throw error;
      return c.html(NOT_BUILT, 503);
    }
  });

  return app;
}
