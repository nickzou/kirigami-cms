import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { bodyLimit } from "hono/body-limit";
import {
  assertValidPath,
  type ContentStore,
  firstHeading,
  InvalidPathError,
  NotFoundError,
  VersionConflictError,
} from "../core/index.js";

const MAX_BODY_BYTES = 10 * 1024 * 1024;
const LOCAL_HOSTNAMES = new Set(["localhost", "127.0.0.1", "[::1]"]);

const ErrorBody = z
  .object({ error: z.object({ code: z.string(), message: z.string() }) })
  .openapi("Error");

const ConflictBody = z
  .object({
    error: z.object({ code: z.string(), message: z.string() }),
    currentVersion: z.string().nullable().openapi({
      description: "The page's version now, or null if it is gone.",
    }),
  })
  .openapi("Conflict");

const PathParam = z.string().openapi({
  param: { name: "path", in: "path" },
  description:
    "The page's path in the site, URL-encoded so that slashes become %2F.",
  example: "blog%2Fhello.md",
});

const Version = z.string().openapi({
  description:
    "Identifies one state of a page. Send back the one you last read.",
});

const PageSummary = z
  .object({ path: z.string(), title: z.string(), version: Version })
  .openapi("PageSummary");

const Page = z
  .object({ path: z.string(), content: z.string(), version: Version })
  .openapi("Page");

const Saved = z.object({ path: z.string(), version: Version }).openapi("Saved");

const SaveRequest = z
  .object({
    content: z
      .string()
      .openapi({ description: "The page's markdown, exactly." }),
    version: Version.nullable().openapi({
      description:
        "The version you last read, or null to create a page that must not exist yet.",
    }),
  })
  .openapi("SaveRequest");

const errorResponse = (description: string) => ({
  description,
  content: { "application/json": { schema: ErrorBody } },
});

const listPages = createRoute({
  method: "get",
  path: "/api/pages",
  summary: "List pages",
  responses: {
    200: {
      description: "Every markdown page in the site.",
      content: {
        "application/json": {
          schema: z.object({ pages: z.array(PageSummary) }),
        },
      },
    },
  },
});

const getPage = createRoute({
  method: "get",
  path: "/api/pages/{path}",
  summary: "Read a page",
  request: { params: z.object({ path: PathParam }) },
  responses: {
    200: {
      description: "The page.",
      content: { "application/json": { schema: Page } },
    },
    400: errorResponse("The path is not a valid page path."),
    404: errorResponse("There is no such page."),
  },
});

const savePage = createRoute({
  method: "put",
  path: "/api/pages/{path}",
  summary: "Create or update a page",
  request: {
    params: z.object({ path: PathParam }),
    body: {
      required: true,
      content: { "application/json": { schema: SaveRequest } },
    },
  },
  responses: {
    200: {
      description: "The page was updated.",
      content: { "application/json": { schema: Saved } },
    },
    201: {
      description: "The page was created.",
      content: { "application/json": { schema: Saved } },
    },
    400: errorResponse("The path or the request body is not valid."),
    409: {
      description:
        "The page changed since you read it (or already exists, or is gone). Nothing was written.",
      content: { "application/json": { schema: ConflictBody } },
    },
  },
});

/** Returns a message if `path` is not something the API serves. */
function pathProblem(path: string): string | undefined {
  try {
    assertValidPath(path);
  } catch (error) {
    if (error instanceof InvalidPathError) return error.message;
    throw error;
  }
  return path.endsWith(".md")
    ? undefined
    : `Invalid path "${path}": pages are markdown files ending in .md`;
}

const titleOf = (path: string, content: string): string =>
  firstHeading(content) ??
  path.slice(path.lastIndexOf("/") + 1).replace(/\.md$/, "");

/**
 * The pages API. It is meant for a server that only listens on this machine:
 * it refuses requests addressed to any other host name, and requests from a
 * page served from a different origin, so another website open in the
 * browser cannot call it.
 */
export function createApiApp(store: ContentStore) {
  const api = new OpenAPIHono({
    defaultHook: (result, c) => {
      if (result.success) return;
      const message = result.error.issues
        .map(
          (issue) => `${issue.path.join(".") || "request"}: ${issue.message}`,
        )
        .join("; ");
      return c.json({ error: { code: "invalid_request", message } }, 400);
    },
  });

  api.use("/api/*", async (c, next) => {
    const url = new URL(c.req.url);
    const origin = c.req.header("origin");
    let sameOrigin = true;
    if (origin !== undefined) {
      try {
        sameOrigin = new URL(origin).host === url.host;
      } catch {
        sameOrigin = false;
      }
    }
    if (!LOCAL_HOSTNAMES.has(url.hostname) || !sameOrigin) {
      return c.json(
        {
          error: {
            code: "forbidden",
            message: "This API only answers requests made from this machine.",
          },
        },
        403,
      );
    }
    await next();
  });

  api.use(
    "/api/*",
    bodyLimit({
      maxSize: MAX_BODY_BYTES,
      onError: (c) =>
        c.json(
          {
            error: { code: "too_large", message: "The request is too large." },
          },
          413,
        ),
    }),
  );

  api.openapi(listPages, async (c) => {
    const entries = (await store.list()).filter((e) => e.path.endsWith(".md"));
    const pages = await Promise.all(
      entries.map(async ({ path }) => {
        try {
          const { content, version } = await store.read(path);
          return { path, title: titleOf(path, content), version };
        } catch (error) {
          if (error instanceof NotFoundError) return undefined; // removed meanwhile
          throw error;
        }
      }),
    );
    return c.json({ pages: pages.filter((p) => p !== undefined) }, 200);
  });

  api.openapi(getPage, async (c) => {
    const { path } = c.req.valid("param");
    const problem = pathProblem(path);
    if (problem) {
      return c.json({ error: { code: "invalid_path", message: problem } }, 400);
    }
    try {
      const { content, version } = await store.read(path);
      return c.json({ path, content, version }, 200);
    } catch (error) {
      if (error instanceof NotFoundError) {
        return c.json(
          { error: { code: "not_found", message: `No such page: ${path}` } },
          404,
        );
      }
      throw error;
    }
  });

  api.openapi(savePage, async (c) => {
    const { path } = c.req.valid("param");
    const { content, version } = c.req.valid("json");
    const problem = pathProblem(path);
    if (problem) {
      return c.json({ error: { code: "invalid_path", message: problem } }, 400);
    }
    try {
      const saved = await store.write(path, content, version);
      return c.json(
        { path, version: saved.version },
        version === null ? 201 : 200,
      );
    } catch (error) {
      if (!(error instanceof VersionConflictError)) throw error;
      const current = await store.read(path).then(
        (page) => page.version,
        (readError: unknown) => {
          if (readError instanceof NotFoundError) return null;
          throw readError;
        },
      );
      return c.json(
        {
          error: { code: "conflict", message: error.message },
          currentVersion: current,
        },
        409,
      );
    }
  });

  api.doc31("/api/openapi.json", {
    openapi: "3.1.0",
    info: { title: "Kirigami API", version: "0.0.0" },
  });

  return api;
}
