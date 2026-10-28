import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { type OutputFile, renderPage, STYLESHEET_PATH } from "../core/index.js";
import type { createApiApp } from "./api.js";
import {
  CLIENT_SCRIPT,
  CLIENT_SCRIPT_PATH,
  EVENTS_PATH,
  SCRIPT_TAG,
} from "./client-script.js";
import type { EventHub } from "./events.js";

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

/** Adds the live-reload script to a page, before `</body>` when there is one. */
function withClientScript(html: string): string {
  const end = html.lastIndexOf("</body>");
  return end === -1
    ? html + SCRIPT_TAG
    : `${html.slice(0, end)}${SCRIPT_TAG}${html.slice(end)}`;
}

export interface SiteAppOptions {
  /** When given, pages get the live-reload script and an event stream is served. */
  hub?: EventHub;
  /** When given, its routes are served ahead of the site (they live under `/api`). */
  api?: ReturnType<typeof createApiApp>;
  /** When given, its routes (the admin app, under `/admin`) are served ahead of the site. */
  admin?: Hono;
}

/**
 * Serves built output files with clean URLs: `/about/` is `about/index.html`,
 * and `/about` redirects to `/about/`. `getFiles` is called on every request,
 * so a caller can swap in a fresh build without restarting.
 */
export function createSiteApp(
  getFiles: () => readonly OutputFile[],
  { hub, api, admin }: SiteAppOptions = {},
) {
  const app = new Hono();
  const page = (html: string): string => (hub ? withClientScript(html) : html);

  if (hub) {
    app.get(CLIENT_SCRIPT_PATH, (c) =>
      c.body(CLIENT_SCRIPT, 200, {
        "Content-Type": "text/javascript; charset=utf-8",
      }),
    );
    app.get(EVENTS_PATH, (c) =>
      streamSSE(c, async (stream) => {
        const unsubscribe = hub.subscribe((event) => {
          void stream.writeSSE({ data: JSON.stringify(event) });
        });
        stream.onAbort(unsubscribe);
        // Keep the handler open until the tab goes away.
        await new Promise<void>((resolve) => stream.onAbort(resolve));
      }),
    );
  }

  if (api) app.route("/", api);
  if (admin) app.route("/", admin);

  app.all("*", (c) => {
    if (api && (c.req.path === "/api" || c.req.path.startsWith("/api/"))) {
      return c.json(
        { error: { code: "not_found", message: "No such API route." } },
        404,
      );
    }
    if (c.req.method !== "GET" && c.req.method !== "HEAD") {
      return c.text("Method not allowed", 405);
    }

    let urlPath: string;
    try {
      urlPath = decodeURIComponent(c.req.path);
    } catch {
      return c.html(page(notFoundPage()), 404);
    }

    const files = new Map(getFiles().map((f) => [f.path, f.content]));
    const relative = urlPath.slice(1);
    const wantsFolder = relative === "" || relative.endsWith("/");

    const target = wantsFolder ? `${relative}index.html` : relative;
    const content = files.get(target);
    if (content !== undefined) {
      const type = contentTypeOf(target);
      return c.body(
        type.startsWith("text/html") ? page(content) : content,
        200,
        {
          "Content-Type": type,
        },
      );
    }

    if (!wantsFolder && files.has(`${relative}/index.html`)) {
      const search = new URL(c.req.url).search;
      return c.redirect(`${c.req.path}/${search}`, 302);
    }

    return c.html(page(notFoundPage()), 404);
  });

  return app;
}
