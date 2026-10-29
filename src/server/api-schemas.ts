import { z } from "@hono/zod-openapi";

// The shapes of the pages API. The admin app imports only the types from here,
// so nothing in this file may reach for Node or server-only modules.

export const ErrorBody = z
  .object({ error: z.object({ code: z.string(), message: z.string() }) })
  .openapi("Error");

export const ConflictBody = z
  .object({
    error: z.object({ code: z.string(), message: z.string() }),
    currentVersion: z.string().nullable().openapi({
      description: "The page's version now, or null if it is gone.",
    }),
  })
  .openapi("Conflict");

export const PathParam = z.string().openapi({
  param: { name: "path", in: "path" },
  description:
    "The page's path in the site, URL-encoded so that slashes become %2F.",
  example: "blog%2Fhello.md",
});

export const Version = z.string().openapi({
  description:
    "Identifies one state of a page. Send back the one you last read.",
});

export const PageSummarySchema = z
  .object({ path: z.string(), title: z.string(), version: Version })
  .openapi("PageSummary");

export const PageSchema = z
  .object({
    path: z.string(),
    content: z.string(),
    version: Version,
    url: z.string().openapi({
      description: "Where the dev server shows this page, e.g. /blog/hello/.",
      example: "/blog/hello/",
    }),
  })
  .openapi("Page");

export const Saved = z
  .object({ path: z.string(), version: Version })
  .openapi("Saved");

export const SaveRequest = z
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

export type ApiError = z.infer<typeof ErrorBody>;
export type Conflict = z.infer<typeof ConflictBody>;
export type PageSummary = z.infer<typeof PageSummarySchema>;
export type Page = z.infer<typeof PageSchema>;
export type Saved = z.infer<typeof Saved>;
export type SaveRequest = z.infer<typeof SaveRequest>;
