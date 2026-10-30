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

export const RenameRequest = z
  .object({
    to: z.string().openapi({
      description: "The page's new path, e.g. blog/renamed.md.",
      example: "blog/renamed.md",
    }),
    version: Version.openapi({
      description: "The version you last read of the page being renamed.",
    }),
  })
  .openapi("RenameRequest");

export const DeleteQuery = z.object({
  version: Version.openapi({
    param: { name: "version", in: "query" },
    description: "The version you last read of the page being deleted.",
  }),
});

export const SiteConfigChangeSchema = z
  .object({
    path: z
      .array(z.string().min(1))
      .min(1)
      .max(8)
      .openapi({
        description: "Where, as keys from the top.",
        example: ["theme", "colors", "link"],
      }),
    value: z.union([z.string(), z.number(), z.null()]).openapi({
      description:
        "The new value, or null to remove the key so the default applies.",
    }),
  })
  .openapi("SiteConfigChange");

export const SiteConfigSchema = z
  .object({
    content: z.string().openapi({
      description:
        "The text of site.yaml, exactly. Empty if there is no file yet.",
    }),
    version: Version.nullable().openapi({
      description: "The file's version, or null if there is no file yet.",
    }),
    values: z.record(z.string(), z.unknown()).nullable().openapi({
      description:
        "What the file sets, as an object, before defaults. Null if the file is not valid (see error).",
    }),
    error: z.string().nullable().openapi({
      description: "Why the file is not valid, or null.",
    }),
  })
  .openapi("SiteConfig");

export const SiteConfigSaveRequest = z
  .object({
    changes: z.array(SiteConfigChangeSchema).max(200),
    version: Version.nullable().openapi({
      description: "The version you last read, or null if there was no file.",
    }),
  })
  .openapi("SiteConfigSaveRequest");

export type ApiError = z.infer<typeof ErrorBody>;
export type Conflict = z.infer<typeof ConflictBody>;
export type PageSummary = z.infer<typeof PageSummarySchema>;
export type Page = z.infer<typeof PageSchema>;
export type Saved = z.infer<typeof Saved>;
export type SaveRequest = z.infer<typeof SaveRequest>;
export type RenameRequest = z.infer<typeof RenameRequest>;
export type SiteConfigChange = z.infer<typeof SiteConfigChangeSchema>;
export type SiteConfig = z.infer<typeof SiteConfigSchema>;
export type SiteConfigSaveRequest = z.infer<typeof SiteConfigSaveRequest>;
