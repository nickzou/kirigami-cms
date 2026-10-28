import { Hono } from "hono";
import { type OutputFile, renderPage, STYLESHEET_PATH } from "../core/index.js";

const CONTENT_TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
};

const NOT_FOUND_SOURCE = `# Not found

There is no page at this address.
`;

const notFoundPage = (): string =>
  renderPage({
    source: NOT_FOUND_SOURCE,
    path: "404.md",
    stylesheet: `/${STYLESHEET_PATH}`,
  });

const contentTypeOf = (path: string): string => {
  const dot = path.lastIndexOf(".");
  return (
    (dot >= 0 ? CONTENT_TYPES[path.slice(dot)] : undefined) ??
    "application/octet-stream"
  );
};

/**
 * Serves built output files with clean URLs: `/about/` is `about/index.html`,
 * and `/about` redirects to `/about/`. `getFiles` is called on every request,
 * so a caller can swap in a fresh build without restarting.
 */
export function createSiteApp(getFiles: () => readonly OutputFile[]) {
  const app = new Hono();

  app.all("*", (c) => {
    if (c.req.method !== "GET" && c.req.method !== "HEAD") {
      return c.text("Method not allowed", 405);
    }

    let urlPath: string;
    try {
      urlPath = decodeURIComponent(c.req.path);
    } catch {
      return c.html(notFoundPage(), 404);
    }

    const files = new Map(getFiles().map((f) => [f.path, f.content]));
    const relative = urlPath.slice(1);
    const wantsFolder = relative === "" || relative.endsWith("/");

    const target = wantsFolder ? `${relative}index.html` : relative;
    const content = files.get(target);
    if (content !== undefined) {
      return c.body(content, 200, { "Content-Type": contentTypeOf(target) });
    }

    if (!wantsFolder && files.has(`${relative}/index.html`)) {
      const search = new URL(c.req.url).search;
      return c.redirect(`${c.req.path}/${search}`, 302);
    }

    return c.html(notFoundPage(), 404);
  });

  return app;
}
