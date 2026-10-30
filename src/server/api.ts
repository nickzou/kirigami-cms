import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { bodyLimit } from "hono/body-limit";
import {
  AlreadyExistsError,
  assertValidPath,
  type ContentStore,
  firstHeading,
  InvalidPathError,
  NotFoundError,
  pagesCollidingWith,
  pageUrl,
  VersionConflictError,
} from "../core/index.js";
import {
  ConflictBody,
  DeleteQuery,
  ErrorBody,
  PageSchema,
  PageSummarySchema,
  PathParam,
  RenameRequest,
  Saved,
  SaveRequest,
} from "./api-schemas.js";

const MAX_BODY_BYTES = 10 * 1024 * 1024;
const LOCAL_HOSTNAMES = new Set(["localhost", "127.0.0.1", "[::1]"]);

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
          schema: z.object({ pages: z.array(PageSummarySchema) }),
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
      content: { "application/json": { schema: PageSchema } },
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

const deletePage = createRoute({
  method: "delete",
  path: "/api/pages/{path}",
  summary: "Delete a page",
  request: {
    params: z.object({ path: PathParam }),
    query: DeleteQuery,
  },
  responses: {
    204: { description: "The page was deleted." },
    400: errorResponse("The path is not a valid page path."),
    404: errorResponse("There is no such page."),
    409: {
      description: "The page changed since you read it. Nothing was deleted.",
      content: { "application/json": { schema: ConflictBody } },
    },
  },
});

const renamePage = createRoute({
  method: "post",
  path: "/api/pages/{path}/rename",
  summary: "Rename (move) a page",
  description:
    "Never overwrites a page. Links in other pages are not rewritten.",
  request: {
    params: z.object({ path: PathParam }),
    body: {
      required: true,
      content: { "application/json": { schema: RenameRequest } },
    },
  },
  responses: {
    200: {
      description: "The page was moved. `path` is its new path.",
      content: { "application/json": { schema: Saved } },
    },
    400: errorResponse("A path or the request body is not valid."),
    404: errorResponse("There is no such page."),
    409: {
      description:
        "Nothing was moved. The error code says why: `conflict` (the page changed since you read it), `exists` (a page is already at the new path) or `collision` (the build would refuse the result, because two pages would share an address).",
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

/** What the build would refuse: another page that would share this page's address. */
function collisionMessage(path: string, clashes: string[]): string {
  return `${path} would be shown at the same address as ${clashes.join(" and ")}, so the site would not build. Pick a different path.`;
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
      return c.json({ path, content, version, url: pageUrl(path) }, 200);
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

  /** The page's version now, or null if there is no such page. */
  const versionNow = (path: string): Promise<string | null> =>
    store.read(path).then(
      (page) => page.version,
      (error: unknown) => {
        if (error instanceof NotFoundError) return null;
        throw error;
      },
    );

  const markdownPaths = async (): Promise<string[]> =>
    (await store.list()).map((e) => e.path).filter((p) => p.endsWith(".md"));

  api.openapi(savePage, async (c) => {
    const { path } = c.req.valid("param");
    const { content, version } = c.req.valid("json");
    const problem = pathProblem(path);
    if (problem) {
      return c.json({ error: { code: "invalid_path", message: problem } }, 400);
    }
    if (version === null) {
      const clashes = pagesCollidingWith(path, await markdownPaths());
      if (clashes.length > 0) {
        return c.json(
          {
            error: {
              code: "collision",
              message: collisionMessage(path, clashes),
            },
            currentVersion: null,
          },
          409,
        );
      }
    }
    try {
      const saved = await store.write(path, content, version);
      return c.json(
        { path, version: saved.version },
        version === null ? 201 : 200,
      );
    } catch (error) {
      if (!(error instanceof VersionConflictError)) throw error;
      return c.json(
        {
          error: { code: "conflict", message: error.message },
          currentVersion: await versionNow(path),
        },
        409,
      );
    }
  });

  api.openapi(deletePage, async (c) => {
    const { path } = c.req.valid("param");
    const { version } = c.req.valid("query");
    const problem = pathProblem(path);
    if (problem) {
      return c.json({ error: { code: "invalid_path", message: problem } }, 400);
    }
    try {
      await store.delete(path, version);
      return c.body(null, 204);
    } catch (error) {
      if (error instanceof NotFoundError) {
        return c.json(
          { error: { code: "not_found", message: `No such page: ${path}` } },
          404,
        );
      }
      if (!(error instanceof VersionConflictError)) throw error;
      return c.json(
        {
          error: { code: "conflict", message: error.message },
          currentVersion: await versionNow(path),
        },
        409,
      );
    }
  });

  api.openapi(renamePage, async (c) => {
    const { path } = c.req.valid("param");
    const { to, version } = c.req.valid("json");
    const problem = pathProblem(path) ?? pathProblem(to);
    if (problem) {
      return c.json({ error: { code: "invalid_path", message: problem } }, 400);
    }
    // Once this page moves it no longer takes up its old address.
    const others = (await markdownPaths()).filter((p) => p !== path);
    const clashes = pagesCollidingWith(to, others);
    if (clashes.length > 0) {
      return c.json(
        {
          error: { code: "collision", message: collisionMessage(to, clashes) },
          currentVersion: await versionNow(path),
        },
        409,
      );
    }
    try {
      const moved = await store.rename(path, to, version);
      return c.json({ path: to, version: moved.version }, 200);
    } catch (error) {
      if (error instanceof NotFoundError) {
        return c.json(
          { error: { code: "not_found", message: `No such page: ${path}` } },
          404,
        );
      }
      if (error instanceof AlreadyExistsError) {
        return c.json(
          {
            error: {
              code: "exists",
              message: `A page already exists at ${to}.`,
            },
            currentVersion: await versionNow(path),
          },
          409,
        );
      }
      if (!(error instanceof VersionConflictError)) throw error;
      return c.json(
        {
          error: { code: "conflict", message: error.message },
          currentVersion: await versionNow(path),
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
